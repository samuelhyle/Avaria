/** Live evaluation: isolated local app, or explicitly selected anonymous review site. */
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { RESEARCH_EVAL_CASES } from "@/lib/ai/eval/research-cases"
import { assessResearchResponse, validateEvaluationTarget } from "@/lib/ai/eval/runner"

const target = validateEvaluationTarget(process.env)
const selectedIds = process.env.AI_EVAL_ONLY?.split(",").filter(Boolean)
if (selectedIds?.some((id) => !RESEARCH_EVAL_CASES.some((entry) => entry.id === id)))
  throw new Error("AI_EVAL_ONLY contains an unknown scenario ID")
const cases = selectedIds?.length
  ? RESEARCH_EVAL_CASES.filter((entry) => selectedIds.includes(entry.id))
  : RESEARCH_EVAL_CASES
if (target.kind === "hosted_review") {
  const response = await fetch(`${target.origin}/en`, {
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
  })
  const robots = response.headers.get("x-robots-tag") ?? ""
  await response.body?.cancel()
  if (!response.ok || !/noindex/i.test(robots) || !/nofollow/i.test(robots))
    throw new Error("Hosted target must still be a noindex, nofollow review site")
}

type Row = ReturnType<typeof assessResearchResponse> & { latencyMs: number; checkedAt: string }
const output =
  process.env.AI_EVAL_OUTPUT ??
  `docs/verification/research-evaluation/${new Date().toISOString().slice(0, 10)}/answers.json`
const suiteHash = createHash("sha256").update(JSON.stringify(cases)).digest("hex")
const rows: Row[] = []
if (process.env.AI_EVAL_RESUME === "1") {
  const previous = JSON.parse(await readFile(output, "utf8"))
  if (previous.origin !== target.origin || previous.suiteHash !== suiteHash)
    throw new Error("Resume target and scenario revision must match the saved evaluation")
  rows.push(...previous.rows)
} else {
  try {
    await readFile(output)
    throw new Error("Output already exists; select a new path or explicitly resume")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

async function checkpoint(state: "running" | "incomplete" | "executed", reason?: string) {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(
    output,
    `${JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        origin: target.origin,
        target: target.kind,
        suiteHash,
        state,
        reason,
        selection: selectedIds?.length ? "paired_subset" : "full_suite",
        expectedCases: cases.length,
        executedCases: rows.length,
        scope:
          "Live API, no persistence, no retrieval, read-only tools. Hosted review runs are anonymous with no cookies. Source, language and scientific assessment are separate from runtime/numerical checks.",
        rows,
      },
      null,
      2,
    )}\n`,
  )
}

await checkpoint("running")
for (const entry of cases) {
  if (rows.some((row) => row.id === entry.id && row.locale === entry.locale)) continue
  const started = Date.now()
  try {
    const response = await fetch(`${target.origin}/api/ai/chat`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
      headers: {
        "content-type": "application/json",
        ...(process.env.AI_EVAL_COOKIE ? { cookie: process.env.AI_EVAL_COOKIE } : {}),
      },
      body: JSON.stringify({
        locale: entry.locale,
        noPersist: true,
        readOnly: true,
        noRetrieve: true,
        messages: [{ id: crypto.randomUUID(), role: "user", content: entry.prompt }],
      }),
    })
    if (response.status === 429 || response.status === 503) {
      await response.body?.cancel()
      const reason = response.status === 429 ? "rate_limited" : "provider_unavailable"
      await checkpoint("incomplete", reason)
      console.error(`${reason}: answers saved; resume after recovery. This is not a pass.`)
      process.exit(2)
    }
    const row = {
      ...assessResearchResponse(entry, response.status, await response.text()),
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    }
    rows.push(row)
    await checkpoint("running")
    console.log(
      `${rows.length}/${cases.length} ${entry.locale}/${entry.id}: ${row.completed && row.numericalCorrectness && !row.invalidSuccess ? "checked" : "needs review"}`,
    )
  } catch (error) {
    await checkpoint("incomplete", (error as Error).name)
    throw error
  }
}
await checkpoint("executed")
if (rows.some((row) => !row.completed || !row.numericalCorrectness || row.invalidSuccess))
  process.exit(1)
console.log("Runtime/numerical checks completed. Saved answers still require editorial assessment.")
