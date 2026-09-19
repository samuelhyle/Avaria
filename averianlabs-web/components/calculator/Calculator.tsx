"use client"

import { useCallback, useMemo } from "react"
import {
  CalculatorCard,
  CalculatorField,
  CalculatorStat,
  PrimaryButton,
  ResultRing,
  SyringeDiagram,
  VialPresetGrid,
} from "@/components/calculator/ui/index"
import {
  BreakevenTab,
  CompareTab,
  DilutionTab,
  ReconstitutionTab,
  TitrationTab,
} from "@/components/calculator/tabs/index"
import {
  formatIu,
  formatMcg,
  formatMg,
  formatMl,
} from "@/lib/calculator"
import { solveReconstitution } from "@/lib/calculator/reconstitution"
import { weeklySchedule } from "@/lib/calculator/titration"
import { formatShelfLife, recommendStorage } from "@/lib/calculator/stability"
import type { CalculatorTab } from "@/lib/calculator/url-state"
import {
  type CalculatorFormState,
  type DerivedResult,
  useCalculatorState,
  type UseCalculatorStateResult,
} from "@/components/calculator/hooks/use-calculator-state"
import { useSavedProtocols, type SavedProtocol } from "@/components/calculator/hooks/use-saved-protocols"
import { useHistory } from "@/components/calculator/hooks/use-history"
import { DoseScheduleTable } from "@/components/calculator/ui/DoseScheduleTable"
import { Beaker, Calculator as CalculatorIcon, Columns as ColumnsIcon, FlaskConical, History, ListChecks, Printer, Save, Scale as ScaleIcon, Send, Share2, Sparkles, TrendingUp } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils/cn"
import { SYRINGE_PRESETS } from "@/lib/calculator/syringe"
import { checkSaturation } from "@/lib/calculator/saturation"

const TABS: CalculatorTab[] = ["reconstitution", "titration", "dilution", "breakeven", "compare"]
const TAB_ICONS: Record<CalculatorTab, React.ComponentType<{ className?: string }>> = {
  reconstitution: CalculatorIcon,
  titration: TrendingUp,
  dilution: Beaker,
  breakeven: ScaleIcon,
  compare: ColumnsIcon,
}

interface Props {
  locale: string
  className?: string
}

/**
 * `Calculator` — the main client island on `/peptide-calculator`.
 *
 * Renders:
 *   - Hero strip with title, copy, and a deep-link CTA into the Averia chat
 *   - Tab strip with five calculators (Reconstitution, Titration, Dilution,
 *     Breakeven, Compare)
 *   - Reconstitution tab in the canonical layout
 *   - Common inputs (peptide mg, BAC water, dose, syringe) live in the
 *     orchestrator and are passed into each tab
 *   - History + Saved protocols in collapsible side panels (mobile-first)
 */
export function Calculator({ className, locale }: Props) {
  const t = useTranslations("calculator")
  const _locale = useLocale()
  const state$ = useCalculatorState()
  const { state, set, setMany, reset, derived } = state$

  const savedProtocolsApi = useSavedProtocols()
  const historyApi = useHistory()
  const savedProtocols = savedProtocolsApi.protocols
  const saveSaved = savedProtocolsApi.save
  const removeSaved = savedProtocolsApi.remove
  const history = historyApi.entries
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback(
    (message: string, ms = 2400) => {
      setToast(message)
      window.setTimeout(() => setToast((current) => (current === message ? null : current)), ms)
    },
    [],
  )

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast(t("actions.shareCopied"))
    } catch {
      showToast("Copy failed — please copy the URL manually.")
    }
  }, [showToast, t])

  const handleSave = useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    saveSaved({
      id,
      name: `${state.vialMg} mg · ${state.solventMl} mL · ${state.doseMcg} mcg`,
      createdAt: new Date().toISOString(),
      inputs: {
        vialMg: state.vialMg,
        solventMl: state.solventMl,
        doseMcg: state.doseMcg,
        syringeLabel: state.syringe.label,
        productSlug: state.productSlug,
      },
    })
    showToast(t("actions.saved"))
  }, [saveSaved, state, showToast, t])

  const handleAskAveria = useCallback(() => {
    if (typeof window === "undefined") return
    const prompt = encodeURIComponent(
      `Help me with reconstitution math: vial ${state.vialMg} mg, ${state.solventMl} mL BAC water, ${state.doseMcg} mcg dose on a ${state.syringe.label}.`,
    )
    window.location.href = `/${locale}/support?openChat=1&prefill=${prompt}`
  }, [locale, state])

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print()
  }, [])

  const titration = useMemo(
    () =>
      weeklySchedule({
        vialMg: state.vialMg,
        solventMl: state.solventMl,
        doseMcg: state.doseMcg,
        weekCount: state.weekCount,
        dosesPerWeek: state.dosesPerWeek,
        syringe: state.syringe,
        locale,
      }),
    [locale, state.dosesPerWeek, state.doseMcg, state.solventMl, state.syringe, state.vialMg, state.weekCount],
  )

  const stability = recommendStorage(state.productSlug)
  const saturation = checkSaturation(derived.recon.concentrationMgPerMl, state.productSlug)

  return (
    <div className={cn("space-y-10", className)}>
      <Hero locale={locale} state={state} onAskAveria={handleAskAveria} />

      <SharedControls state={state} set={set} derived={derived} setMany={setMany} />

      <TabStrip tab={state.tab} onChange={(tab) => set("tab", tab)} />

      {state.tab === "reconstitution" ? (
        <ReconstitutionTab state={state} set={set} derived={derived} />
      ) : null}

      {state.tab === "titration" ? <TitrationTab state={state} set={set} derived={derived} /> : null}

      {state.tab === "dilution" ? <DilutionTab state={state} set={set} derived={derived} /> : null}

      {state.tab === "breakeven" ? (
        <BreakevenTab vialMg={state.vialMg} doseMcg={state.doseMcg} />
      ) : null}

      {state.tab === "compare" ? (
        <CompareTab base={{ vialMg: state.vialMg, solventMl: state.solventMl, doseMcg: state.doseMcg }} />
      ) : null}

      <StabilityAndOutput
        state={state}
        entries={titration.entries}
        stability={stability}
        saturation={saturation}
      />

      <ActionToolbar
        onShare={handleShare}
        onSave={handleSave}
        onReset={reset}
        onPrint={handlePrint}
        onAskAveria={handleAskAveria}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSaved={() => setSavedOpen(true)}
        historyCount={history.length}
        savedCount={savedProtocols.length}
      />

      {historyOpen ? (
        <HistoryDrawer onClose={() => setHistoryOpen(false)} />
      ) : null}
      {savedOpen ? (
        <SavedDrawer
          onClose={() => setSavedOpen(false)}
          onApply={(p) => {
            if (!p) return
            setMany(p as unknown as Partial<CalculatorFormState>)
          }}
        />
      ) : null}

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-2 text-2xs text-ink shadow-[var(--shadow-md)]"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}

function Hero({ locale, state, onAskAveria }: { locale: string; state: CalculatorFormState; onAskAveria: () => void }) {
  const t = useTranslations("calculator")
  void locale
  void state
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-gradient-to-br from-accent-soft via-surface to-ice-soft p-8 sm:p-12">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 text-2xs uppercase tracking-wide text-ink-muted">
          <Sparkles className="h-3 w-3 text-accent" />
          {t("heroEyebrow")}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-prose text-base text-ink-muted">{t("heroBody")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton onClick={onAskAveria}>
            <Send className="h-4 w-4" />
            {t("openInAveria")}
          </PrimaryButton>
          <a
            href="#calculator-tabs"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <FlaskConical className="h-4 w-4 text-accent" />
            {t("viewAllTools")}
          </a>
        </div>
      </div>
      {/* Decorative SVG syringe */}
      <SyringeDiagram
        volumeMl={0.1}
        compact={false}
        className="pointer-events-none absolute -right-12 top-1/2 hidden w-[420px] -translate-y-1/2 opacity-30 lg:block"
        ariaLabel=""
      />
    </section>
  )
}

function SharedControls({
  state,
  set,
  derived,
  setMany,
}: {
  state: CalculatorFormState
  set: <K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => void
  derived: DerivedResult
  setMany: UseCalculatorStateResult["setMany"]
}) {
  const t = useTranslations("calculator")
  return (
    <CalculatorCard tone="muted" inset as="section">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CalculatorField
          id="shared-vialMg"
          label={t("peptideMass")}
          unit="mg"
          value={state.vialMg}
          onChange={(e) => set("vialMg", Math.max(0.1, Number(e.target.value) || 0))}
        />
        <CalculatorField
          id="shared-solventMl"
          label={t("bacteriostaticWater")}
          unit="mL"
          value={state.solventMl}
          onChange={(e) => set("solventMl", Math.max(0.1, Number(e.target.value) || 0))}
        />
        <CalculatorField
          id="shared-doseMcg"
          label={t("desiredDose")}
          unit="mcg"
          value={state.doseMcg}
          onChange={(e) => set("doseMcg", Math.max(1, Number(e.target.value) || 0))}
        />
        <select
          aria-label={t("syringe")}
          className="h-11 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink"
          value={state.syringe.barrelMl}
          onChange={(e) => {
            const ml = Number(e.target.value)
            const found = SYRINGE_PRESETS.find((s) => s.barrelMl === ml) ?? SYRINGE_PRESETS[2]!
            setMany({ syringe: found })
          }}
        >
          {SYRINGE_PRESETS.map((s) => (
            <option key={s.barrelMl} value={s.barrelMl}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-2xs text-ink-subtle">
        <span>
          {t("concentration")}: <strong className="text-ink">{derived.recon.concentrationMgPerMl.toFixed(2)}</strong> mg/mL
        </span>
        <span>
          {t("volumePerDose")}: <strong className="text-ink">{derived.recon.volumePerDoseMl.toFixed(3)}</strong> mL
        </span>
        <span>
          {t("iuOnSyringe")}: <strong className="text-ink">{derived.recon.iuPerDoseSnapped.toFixed(0)}</strong> IU
        </span>
        <span>
          {t("totalDoses")}: <strong className="text-ink">{derived.recon.totalDoses}</strong>
        </span>
        <span>
          {t("leftoverMcg")}: <strong className="text-ink">{derived.recon.leftoverMcg.toFixed(0)}</strong> mcg
        </span>
      </div>
    </CalculatorCard>
  )
}

function TabStrip({ tab, onChange }: { tab: CalculatorTab; onChange: (tab: CalculatorTab) => void }) {
  const t = useTranslations("calculator")
  return (
    <div
      id="calculator-tabs"
      className="flex flex-wrap gap-2 rounded-[var(--radius)] border border-line bg-surface p-1 shadow-[var(--shadow-xs)]"
      role="tablist"
      aria-label={t("title")}
    >
      {TABS.map((currentTab) => {
        const Icon = TAB_ICONS[currentTab]
        const isActive = currentTab === tab
        return (
          <button
            key={currentTab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(currentTab)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-accent text-on-accent shadow-sm"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(`tabs.${currentTab}`)}
          </button>
        )
      })}
    </div>
  )
}

function StabilityAndOutput({
  state,
  entries,
  stability,
  saturation,
}: {
  state: CalculatorFormState
  entries: ReturnType<typeof weeklySchedule>["entries"]
  stability: ReturnType<typeof recommendStorage>
  saturation: ReturnType<typeof checkSaturation>
}) {
  const t = useTranslations("calculator")
  return (
    <section className="space-y-3">
      <h3 className="font-display text-base font-semibold text-ink">{t("stability.title")}</h3>
      <p className="text-2xs text-ink-muted">{t("stability.subtitle")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <CalculatorStat label={t("stability.refrigerated")} value={formatShelfLife(stability.shelfLifeDays)} tone="ice" />
        <CalculatorStat label={t("stability.frozen")} value={formatShelfLife(stability.shelfLifeDays * 3)} tone="accent" />
        <CalculatorStat label={t("stability.room")} value={formatShelfLife(Math.max(1, Math.floor(stability.shelfLifeDays / 14)))} tone="warn" />
      </div>
      {stability.notes ? (
        <p className="rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-2xs text-ink-muted">
          {stability.notes}
        </p>
      ) : null}
      {saturation.level !== "ok" ? (
        <p
          className={cn(
            "rounded-[var(--radius)] border px-3 py-2 text-xs",
            saturation.level === "above"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-warn/30 bg-warn-soft text-warn",
          )}
        >
          {saturation.level === "above" ? t("validation.concentrationTooHigh") : t("validation.concentrationCaution")}
        </p>
      ) : null}
      <div className="mt-4">
        <DoseScheduleTable entries={entries} />
        <p className="mt-2 text-2xs text-ink-subtle">
          Weekly plan: <strong>{state.weekCount}</strong> weeks × <strong>{state.dosesPerWeek}</strong> doses —{" "}
          <strong>{entries.length}</strong> total doses.
        </p>
      </div>
    </section>
  )
}

function ActionToolbar({
  onShare,
  onSave,
  onReset,
  onPrint,
  onAskAveria,
  onOpenHistory,
  onOpenSaved,
  historyCount,
  savedCount,
}: {
  onShare: () => void
  onSave: () => void
  onReset: () => void
  onPrint: () => void
  onAskAveria: () => void
  onOpenHistory: () => void
  onOpenSaved: () => void
  historyCount: number
  savedCount: number
}) {
  const t = useTranslations("calculator")
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3 shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap gap-2">
        <PrimaryButton variant="secondary" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          {t("actions.share")}
        </PrimaryButton>
        <PrimaryButton variant="secondary" onClick={onSave}>
          <Save className="h-4 w-4" />
          {t("actions.save")}
        </PrimaryButton>
        <PrimaryButton variant="ghost" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          {t("actions.print")}
        </PrimaryButton>
        <PrimaryButton variant="ghost" onClick={onAskAveria}>
          <Send className="h-4 w-4" />
          {t("actions.sendToAveria")}
        </PrimaryButton>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSaved}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-2xs text-ink-muted hover:bg-surface-2"
        >
          <ListChecks className="h-3.5 w-3.5 text-ice" />
          {t("actions.openSaved")} {savedCount > 0 ? `(${savedCount})` : ""}
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-2xs text-ink-muted hover:bg-surface-2"
        >
          <History className="h-3.5 w-3.5 text-accent" />
          {t("actions.viewHistory")} {historyCount > 0 ? `(${historyCount})` : ""}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-2xs text-ink-muted hover:bg-danger-soft"
        >
          {t("actions.reset")}
        </button>
      </div>
    </section>
  )
}

function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const t = useTranslations("calculator")
  const historyApi = useHistory()
  const entries = historyApi.entries
  const remove = historyApi.remove
  const clear = historyApi.clear
  return (
    <SideDrawer title={t("history.title")} subtitle={t("history.subtitle")} onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("history.empty")}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                // eslint-disable-next-line react/no-array-index-key
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface p-3"
              >
                <div className="grid grid-cols-2 gap-2 font-mono text-2xs">
                  <span>{formatMg(entry.inputs.vialMg)}</span>
                  <span>{entry.inputs.solventMl} mL</span>
                  <span>{formatMcg(entry.inputs.doseMcg)}</span>
                  <span>{entry.inputs.syringeLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  className="text-2xs text-ink-subtle hover:text-danger"
                >
                  {t("history.remove")}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={clear}
            className="mt-3 text-2xs text-ink-subtle hover:text-danger"
          >
            {t("actions.clearHistory")}
          </button>
        </>
      )}
    </SideDrawer>
  )
}

function SavedDrawer({
  onClose,
  onApply,
}: {
  onClose: () => void
  onApply: (input: SavedProtocol | null) => void
}) {
  const t = useTranslations("calculator")
  const { protocols, remove } = useSavedProtocols()
  return (
    <SideDrawer title={t("presets.title")} subtitle={t("presets.subtitle")} onClose={onClose}>
      {protocols.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("presets.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {protocols.map((protocol) => (
            <li
              key={protocol.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface p-3"
            >
              <div>
                <div className="text-sm font-medium text-ink">{protocol.name}</div>
                <div className="font-mono text-2xs text-ink-subtle">
                  {formatMg(protocol.inputs.vialMg)} · {protocol.inputs.solventMl} mL · {formatMcg(protocol.inputs.doseMcg)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApply(protocol)
                    onClose()
                  }}
                  className="rounded-full bg-accent px-3 py-1 text-2xs text-on-accent hover:bg-accent-hover"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => remove(protocol.id)}
                  className="text-2xs text-ink-subtle hover:text-danger"
                >
                  {t("actions.deleteProtocol")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SideDrawer>
  )
}

function SideDrawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex justify-end bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-6 shadow-[var(--shadow-md)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="text-2xs text-ink-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

// Force a tree-shake safety check: although `formatMl` / `formatIu` aren't used
// directly here, they are imported to keep the public surface consistent with
// the lib barrel and to silence the bundler when other tabs reference them.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _formatRefs = { formatMl, formatIu }
