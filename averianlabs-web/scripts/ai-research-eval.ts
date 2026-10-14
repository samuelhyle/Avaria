/** Live-provider evaluation against an isolated local app, with write tools disabled. */
import { mkdir, writeFile } from "node:fs/promises"
import { RESEARCH_EVAL_CASES } from "@/lib/ai/eval/research-cases"
import { calculateLaboratory } from "@/lib/calculations"
const base = process.env.BASE_URL
if (
  !base ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL !== process.env.DATABASE_URL
)
  throw new Error("An isolated local target and matching TEST_DATABASE_URL are required.")
const rows = []
for (const entry of RESEARCH_EVAL_CASES) {
  const started = Date.now()
  const response = await fetch(`${base}/api/ai/chat`, {
    method: "POST",
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
  if (response.status === 503) {
    console.error("Live provider unavailable: evaluation not executed; this is not a pass.")
    process.exit(2)
  }
  if (response.status === 429) {
    console.error("Evaluation rate limited. Resume after the limit resets; this is not a pass.")
    process.exit(2)
  }
  const events = (await response.text())
    .split("\n")
    .filter((s) => s.startsWith("data: "))
    .flatMap((s) => {
      try {
        return [JSON.parse(s.slice(6))]
      } catch {
        return []
      }
    })
  const answer = events
    .filter((e) => e.type === "text")
    .map((e) => e.delta)
    .join("")
  const calculations = events
    .filter((e) => e.type === "tool-result" && e.content?.calculation)
    .map((e) => e.content.calculation)
  const expected = entry.calculation ? calculateLaboratory(entry.calculation) : null
  const numericalCorrectness =
    !expected ||
    calculations.some((c) =>
      Object.entries(expected.values).every(
        ([k, v]) =>
          typeof c.values?.[k] === "number" &&
          Math.abs(c.values[k] - v) <= 1e-8 * Math.max(1, Math.abs(v)),
      ),
    )
  const invalidSuccess = Boolean(entry.mustAbstain && calculations.length > 0)
  const completed = response.ok && answer.length > 0 && !events.some((e) => e.type === "error")
  rows.push({
    id: entry.id,
    locale: entry.locale,
    status: response.status,
    completed,
    numericalCorrectness,
    invalidSuccess,
    assessment: {
      taskCompletion: completed ? "runtime_completed" : "incomplete",
      numericalCorrectness: expected ? (numericalCorrectness ? "pass" : "fail") : "not_applicable",
      factualSupport: "pending_human_review",
      citationValidity: "pending_source_review",
      languageQuality: "pending_finnish_english_editorial_review",
      abstention: entry.mustAbstain ? "pending_answer_review" : "not_applicable",
    },
    latencyMs: Date.now() - started,
    answer,
    toolNames: events.filter((e) => e.type === "tool-result").map((e) => e.name),
    citations: events.filter((e) => e.type === "citations").flatMap((e) => e.citations),
  })
  console.log(
    `${entry.locale} ${entry.id}: ${completed && numericalCorrectness && !invalidSuccess ? "checked" : "needs review"}`,
  )
}
await mkdir("docs/verification/research-workspace-2026-10-14", { recursive: true })
await writeFile(
  "docs/verification/research-workspace-2026-10-14/live-ai-evaluation.json",
  `${JSON.stringify({ checkedAt: new Date().toISOString(), scope: "Isolated app, live model, read-only tool registry. Automated numerical/task checks; scientific/editorial judgement of each answer remains required.", rows }, null, 2)}\n`,
)

if (rows.some((r) => !r.completed || !r.numericalCorrectness || r.invalidSuccess)) process.exit(1)
console.log(
  "Runtime/numerical checks passed; review factual support, citations and Finnish/English wording in the saved answers before release.",
)
