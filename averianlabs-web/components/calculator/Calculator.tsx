"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  type CalculationMode,
  type LaboratoryInputs,
  type LaboratoryResult,
  calculateLaboratory,
  concentrationToMgMl,
  massToMg,
  parseLaboratoryNumber,
  volumeToMl,
} from "@/lib/calculations"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  type CalculationField,
  type InputOrigin,
  calculationFields,
  calculationOrigins,
} from "./input-state"

export function Calculator({
  initial,
  source,
  isAuthed = false,
}: {
  initial?: LaboratoryInputs
  source?: { sku: string; name: string; nominalMassMg?: number }
  isAuthed?: boolean
}) {
  const t = useTranslations("calculator")
  const r = useTranslations("research")
  const locale = useLocale()
  const [currentSource, setCurrentSource] = useState(source)
  const [mode, setMode] = useState<CalculationMode>(initial?.mode ?? "concentration")
  const [fields, setFields] = useState(() => calculationFields(initial))
  const [origins, setOrigins] = useState(() =>
    calculationOrigins(initial, Boolean(source && initial?.massMg === source.nominalMassMg)),
  )
  const [units, setUnits] = useState({
    mass: "mg",
    volume: "mL",
    aliquot: "mcg",
    stock: "mg/mL",
    target: "mg/mL",
  })
  const [history, setHistory] = useState<
    Array<{ id: string; createdAt: string; inputs: LaboratoryInputs; sourceSku: string | null }>
  >([])
  const [busy, setBusy] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const formulaRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const key = "averianlabs:calculation-language-transfer"
    try {
      const raw = sessionStorage.getItem(key)
      sessionStorage.removeItem(key)
      if (raw) {
        const saved = JSON.parse(raw)
        if (
          Date.now() - saved.at < 15_000 &&
          ["concentration", "volume", "dilution", "aliquots"].includes(saved.mode) &&
          ["mass", "volume", "aliquot", "stock", "target"].every(
            (key) => typeof saved.fields?.[key] === "string" && saved.fields[key].length < 128,
          ) &&
          ["mg", "mcg"].includes(saved.units?.mass) &&
          ["mg", "mcg"].includes(saved.units?.aliquot) &&
          ["mL", "uL"].includes(saved.units?.volume) &&
          ["mg/mL", "mcg/mL"].includes(saved.units?.stock) &&
          ["mg/mL", "mcg/mL"].includes(saved.units?.target)
        ) {
          setMode(saved.mode)
          setFields(saved.fields)
          setUnits(saved.units)
          setOrigins(
            Object.fromEntries(
              ["mass", "volume", "aliquot", "stock", "target"].map((key) => [
                key,
                ["example", "catalogue", "transferred", "user", "saved"].includes(
                  saved.origins?.[key],
                )
                  ? saved.origins[key]
                  : "transferred",
              ]),
            ) as Record<CalculationField, InputOrigin>,
          )
          setCurrentSource(
            saved.source &&
              typeof saved.source.sku === "string" &&
              saved.source.sku.length <= 80 &&
              typeof saved.source.name === "string" &&
              saved.source.name.length <= 300
              ? saved.source.sku === source?.sku
                ? source
                : saved.source
              : undefined,
          )
        }
      }
    } catch {
      // A disabled browser store must not prevent a calculation.
    }
  }, [source])
  useEffect(() => {
    const transfer = () => {
      try {
        sessionStorage.setItem(
          "averianlabs:calculation-language-transfer",
          JSON.stringify({
            at: Date.now(),
            mode,
            units,
            origins,
            source: currentSource ?? null,
            fields: Object.fromEntries(
              Object.entries(fields).map(([key, value]) => {
                const parsed = parseLaboratoryNumber(value, locale)
                return [key, parsed === null ? value : String(parsed)]
              }),
            ),
          }),
        )
      } catch {
        // Optional, one-use handoff; private account history is saved explicitly.
      }
    }
    window.addEventListener("averianlabs:before-locale-switch", transfer)
    return () => window.removeEventListener("averianlabs:before-locale-switch", transfer)
  }, [fields, units, origins, mode, locale, currentSource])
  useEffect(() => {
    let wasOpen = false
    const beforePrint = () => {
      wasOpen = formulaRef.current?.open ?? false
      if (formulaRef.current) formulaRef.current.open = true
    }
    const afterPrint = () => {
      if (formulaRef.current) formulaRef.current.open = wasOpen
    }
    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)
    return () => {
      window.removeEventListener("beforeprint", beforePrint)
      window.removeEventListener("afterprint", afterPrint)
    }
  }, [])
  const fieldsNeeded =
    mode === "dilution"
      ? ["stock", "target", "volume"]
      : mode === "volume"
        ? ["mass", "target"]
        : mode === "aliquots"
          ? ["mass", "volume", "aliquot"]
          : ["mass", "volume"]
  const parsed = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, parseLaboratoryNumber(v, locale)]),
  )
  const incomplete = fieldsNeeded.some((k) => !fields[k as keyof typeof fields].trim())
  const invalid = fieldsNeeded.some((k) => parsed[k] === null)
  const inputs: LaboratoryInputs = {
    mode,
    ...(fieldsNeeded.includes("mass")
      ? { massMg: massToMg(parsed.mass ?? 0, units.mass as "mg" | "mcg") }
      : {}),
    ...(fieldsNeeded.includes("volume")
      ? { finalVolumeMl: volumeToMl(parsed.volume ?? 0, units.volume as "mL" | "uL") }
      : {}),
    ...(fieldsNeeded.includes("aliquot")
      ? { aliquotMcg: massToMg(parsed.aliquot ?? 0, units.aliquot as "mg" | "mcg") * 1000 }
      : {}),
    ...(fieldsNeeded.includes("stock")
      ? { stockMgPerMl: concentrationToMgMl(parsed.stock ?? 0, units.stock as "mg/mL" | "mcg/mL") }
      : {}),
    ...(fieldsNeeded.includes("target")
      ? {
          targetMgPerMl: concentrationToMgMl(
            parsed.target ?? 0,
            units.target as "mg/mL" | "mcg/mL",
          ),
        }
      : {}),
  }
  const result = !incomplete && !invalid ? calculateLaboratory(inputs) : null
  const error = incomplete
    ? "incomplete"
    : invalid
      ? "invalid"
      : mode === "dilution" && (inputs.targetMgPerMl ?? 0) > (inputs.stockMgPerMl ?? 0)
        ? "targetTooHigh"
        : mode === "aliquots" && (inputs.aliquotMcg ?? 0) > (inputs.massMg ?? 0) * 1000
          ? "aliquotTooLarge"
          : "range"
  const number = (n: number) =>
    new Intl.NumberFormat(locale, { maximumSignificantDigits: 8 }).format(n)
  const symbols: Record<string, string> = {
    concentrationMgPerMl: "mg/mL",
    concentrationMcgPerMl: "µg/mL",
    finalVolumeMl: "mL",
    finalVolumeUl: "µL",
    stockVolumeMl: "mL",
    stockVolumeUl: "µL",
    makeUpVolumeMl: "mL",
    aliquotVolumeMl: "mL",
    aliquotVolumeUl: "µL",
    aliquotCount: "",
    remainingMassMcg: "µg",
    remainingVolumeMl: "mL",
  }
  const labels: Record<string, string> = {
    concentrationMgPerMl: "concentration",
    concentrationMcgPerMl: "concentration",
    finalVolumeMl: "finalVolume",
    finalVolumeUl: "finalVolume",
    stockVolumeMl: "stockVolume",
    stockVolumeUl: "stockVolume",
    makeUpVolumeMl: "makeUp",
    aliquotVolumeMl: "aliquotVolume",
    aliquotVolumeUl: "aliquotVolume",
    aliquotCount: "count",
    remainingMassMcg: "remainingMass",
    remainingVolumeMl: "remainingVolume",
  }
  const primaryResultKey =
    mode === "concentration"
      ? "concentrationMgPerMl"
      : mode === "volume"
        ? "finalVolumeMl"
        : mode === "dilution"
          ? "stockVolumeMl"
          : "aliquotVolumeMl"
  const compactResult = result
    ? Object.entries(result.values)
        .filter(([key]) => !key.endsWith("Ul") && key !== "concentrationMcgPerMl")
        .slice(0, 2)
        .map(
          ([key, value]) =>
            `${t(labels[key] ?? "concentration")}: ${number(value)} ${symbols[key]}`,
        )
        .join(". ")
    : t(error)
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(compactResult), 650)
    return () => window.clearTimeout(timer)
  }, [compactResult])
  const exportText = (calc: LaboratoryResult) =>
    [
      t("exportTitle"),
      `${t("mode")}: ${t(calc.inputs.mode === "volume" ? "targetVolume" : calc.inputs.mode)}`,
      `${t("formula")}: ${calc.formula}`,
      ...Object.entries(calc.inputs)
        .filter(([k]) => k !== "mode")
        .map(([k, v]) => {
          const inputLabels: Record<string, [string, string]> = {
            massMg: ["mass", "mg"],
            finalVolumeMl: ["volume", "mL"],
            aliquotMcg: ["aliquot", "µg"],
            stockMgPerMl: ["stock", "mg/mL"],
            targetMgPerMl: ["target", "mg/mL"],
          }
          const [label, unit] = inputLabels[k] ?? [k, ""]
          return `${t(label)}: ${number(Number(v))} ${unit}`
        }),
      ...Object.entries(calc.values).map(
        ([k, v]) => `${t(labels[k] ?? "concentration")}: ${number(v)} ${symbols[k]}`,
      ),
      currentSource ? `${t("nominal")}: ${currentSource.sku}` : t("manual"),
      t("assumptions"),
      t("rounding"),
      `${t("version")}: ${calc.version}`,
    ].join("\n")
  const handoff = new URLSearchParams(Object.entries(inputs).map(([k, v]) => [k, String(v)]))
  if (currentSource) handoff.set("sku", currentSource.sku)
  const load = (
    next: LaboratoryInputs | undefined,
    nextSource?: { sku: string; name: string; nominalMassMg?: number },
    saved = false,
  ) => {
    setCurrentSource(nextSource)
    setMode(next?.mode ?? "concentration")
    setUnits({ mass: "mg", volume: "mL", aliquot: "mcg", stock: "mg/mL", target: "mg/mL" })
    setFields(calculationFields(next))
    setOrigins(
      calculationOrigins(
        next,
        Boolean(nextSource && next?.massMg === nextSource.nominalMassMg),
        saved,
      ),
    )
  }
  const readHistory = async () => {
    setBusy(true)
    try {
      const response = await fetch("/api/calculations")
      if (!response.ok) throw new Error()
      const data = await response.json()
      setHistory(data.items)
      setHistoryLoaded(true)
    } catch {
      toast.error(t("requestFailed"))
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    if (!result) return
    setBusy(true)
    try {
      const response = await fetch("/api/calculations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs, sourceSku: currentSource?.sku ?? null }),
      })
      if (!response.ok) throw new Error()
      setSavedAt(new Date())
      toast.success(t("saved"))
      await readHistory()
    } catch {
      toast.error(t("requestFailed"))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-5">
      <div role="group" className="flex flex-wrap gap-2" aria-label={t("mode")}>
        {(["concentration", "dilution", "aliquots"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m || (m === "concentration" && mode === "volume")}
            onClick={() => setMode(m)}
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium sm:flex-none ${mode === m || (m === "concentration" && mode === "volume") ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface"}`}
          >
            {t(m)}
          </button>
        ))}
      </div>
      {currentSource && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          {t("nominal")} · <span className="font-mono text-ink">{currentSource.sku}</span> ·{" "}
          {currentSource.name}
          <br />
          {t("nominalNote")}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{r("inputs")}</h2>
          {(mode === "concentration" || mode === "volume") && (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mode === "volume"}
                onChange={(e) => setMode(e.target.checked ? "volume" : "concentration")}
              />
              {t("targetVolume")}
            </label>
          )}
          <div className="mt-4 space-y-4">
            {fieldsNeeded.map((key) => {
              const k = key as keyof typeof fields
              const options =
                k === "volume"
                  ? ["mL", "uL"]
                  : k === "stock" || k === "target"
                    ? ["mg/mL", "mcg/mL"]
                    : ["mg", "mcg"]
              return (
                <div className="grid grid-cols-[minmax(0,1fr)_96px] items-start gap-2" key={k}>
                  <Input
                    label={t(k)}
                    value={fields[k]}
                    inputMode="decimal"
                    onChange={(e) => {
                      setFields({ ...fields, [k]: e.target.value })
                      setOrigins({ ...origins, [k]: "user" })
                    }}
                    hint={fields[k] ? t(`origin.${origins[k]}`) : t("requiredQuantity")}
                    error={fields[k] && parsed[k] === null ? t("invalid") : undefined}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                      {t("unit")}
                    </span>
                    <select
                      aria-label={`${t(k)} · ${t("unit")}`}
                      value={units[k]}
                      onChange={(e) => {
                        const n = parsed[k]
                        const old = units[k]
                        const next = e.target.value
                        if (n != null) {
                          const oldSmall = old === "mcg" || old === "uL" || old === "mcg/mL"
                          const newSmall = next === "mcg" || next === "uL" || next === "mcg/mL"
                          setFields({
                            ...fields,
                            [k]: String((n * (oldSmall ? 0.001 : 1)) / (newSmall ? 0.001 : 1)),
                          })
                        }
                        setUnits({ ...units, [k]: next })
                      }}
                      className="h-11 w-full rounded-lg border border-line bg-surface px-2 text-base"
                    >
                      {options.map((u) => (
                        <option key={u} value={u}>
                          {u.replace("mcg", "µg").replace("uL", "µL")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("entryHint")}</p>
          {!initial && !currentSource && (
            <p className="mt-2 text-sm text-ink-muted">{t("exampleInputs")}</p>
          )}
        </section>
        <section
          aria-live="off"
          className="rounded-xl border border-accent/30 bg-accent-soft/40 p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold">{r("results")}</h2>
          {result ? (
            <dl className="mt-4 divide-y divide-line">
              {Object.entries(result.values)
                .filter(([k]) => !k.endsWith("Ul") && k !== "concentrationMcgPerMl")
                .sort(([a], [b]) => Number(b === primaryResultKey) - Number(a === primaryResultKey))
                .map(([k, v]) => (
                  <div
                    key={k}
                    data-primary-result={k === primaryResultKey ? "true" : undefined}
                    className={
                      k === primaryResultKey
                        ? "min-w-0 pb-5 pt-1"
                        : "flex flex-wrap justify-between gap-2 py-3"
                    }
                  >
                    <dt className="text-sm text-ink-muted">{t(labels[k] ?? "concentration")}</dt>
                    <dd
                      className={
                        k === primaryResultKey
                          ? "mt-2 break-words font-mono text-3xl font-semibold leading-tight tracking-tight text-accent-ink tabular-nums [overflow-wrap:anywhere] sm:text-4xl"
                          : "font-mono text-lg font-medium tabular-nums"
                      }
                    >
                      {number(v)}{" "}
                      <span
                        className={
                          k === primaryResultKey
                            ? "whitespace-nowrap text-lg font-medium"
                            : "text-sm"
                        }
                      >
                        {symbols[k]}
                      </span>
                      {k === "aliquotVolumeMl" && (
                        <span className="block text-right text-xs text-ink-muted">
                          {number(result.values.aliquotVolumeUl ?? 0)} µL
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p
              role="status"
              aria-live="off"
              className={`mt-5 text-sm ${incomplete ? "text-ink-muted" : "text-danger"}`}
            >
              {t(error)}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("assumptions")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("rounding")}</p>
        </section>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {savedAt && (
        <p role="status" className="text-sm text-ink-muted">
          {t("savedAt", {
            time: new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(savedAt),
          })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => load(initial, source)}>
          {t("reset")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!result}
          onClick={async () => {
            if (result)
              try {
                await navigator.clipboard.writeText(exportText(result))
                toast.success(t("copied"))
              } catch {
                toast.error(t("requestFailed"))
              }
          }}
        >
          {t("copy")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!result}
          onClick={() => {
            if (!result) return
            const rows = [
              ["record", "laboratory calculation"],
              ["version", result.version],
              ["createdAt", new Date().toISOString()],
              ["sourceSku", currentSource?.sku ?? "user supplied"],
              ["formula", result.formula],
              ["assumptions", t("assumptions")],
              ...Object.entries(result.inputs).map(([k, v]) => [k, String(v)]),
              ...Object.entries(result.values).map(([k, v]) => [k, String(v)]),
            ]
            const csv = rows
              .map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
              .join("\r\n")
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
            const a = document.createElement("a")
            a.href = url
            a.download = "averianlabs-laboratory-calculation.csv"
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          {t("export")}
        </Button>
        <Button variant="outline" size="sm" disabled={!result} onClick={() => window.print()}>
          {t("print")}
        </Button>
        {isAuthed ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!result || busy}
              onClick={() => void save()}
            >
              {t("save")}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void readHistory()}>
              {t("history")}
            </Button>
          </>
        ) : (
          <Link
            className="inline-flex items-center px-3 text-sm text-accent underline"
            href={`/${locale}/account?returnTo=${encodeURIComponent(`/${locale}/peptide-calculator?${handoff}`)}`}
          >
            {t("signInHistory")}
          </Link>
        )}
      </div>
      {result && (
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href={`/${locale}/assistant?${handoff}`} className="text-accent underline">
            {t("askAssistant")}
          </Link>
          <Link
            href={`/${locale}/community/new?calculation=${encodeURIComponent(exportText(result))}`}
            className="text-accent underline"
          >
            {t("discuss")}
          </Link>
        </div>
      )}
      <details ref={formulaRef} className="rounded-xl border border-line bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">{t("formula")}</summary>
        <p className="mt-4 font-mono text-sm">{result?.formula ?? t("incomplete")}</p>
        {result && (
          <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-ink-muted">
            {exportText(result)}
          </pre>
        )}
        <p className="mt-4 text-sm text-ink-muted">{r("calculatorNotice")}</p>
      </details>
      {historyLoaded && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">{t("historyPrivate")}</p>
          {history.length === 0 && <p className="text-sm text-ink-muted">{t("historyEmpty")}</p>}
          {history.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 border-t border-line py-3"
            >
              <span className="flex-1 text-sm">
                {t(item.inputs.mode === "volume" ? "targetVolume" : item.inputs.mode)} ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}{" "}
                {item.sourceSku && <span className="font-mono">· {item.sourceSku}</span>}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  load(
                    item.inputs,
                    item.sourceSku ? { sku: item.sourceSku, name: item.sourceSku } : undefined,
                    true,
                  )
                }
              >
                {t("load")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const res = await fetch(`/api/calculations/${item.id}`, { method: "DELETE" })
                    if (!res.ok) throw new Error()
                    setHistory((previous) => previous.filter((x) => x.id !== item.id))
                  } catch {
                    toast.error(t("requestFailed"))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {t("delete")}
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
