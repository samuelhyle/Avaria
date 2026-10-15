import { calculateLaboratory } from "@/lib/calculations"
import type { ResearchEvalCase } from "./research-cases"

/** Hosted evaluation is deliberately restricted to the existing review site. */
export function validateEvaluationTarget(env: Record<string, string | undefined>) {
  if (!env.BASE_URL) throw new Error("BASE_URL is required")
  const url = new URL(env.BASE_URL)
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("Use an origin without credentials, a path or parameters")
  if (env.AI_EVAL_TARGET === "review") {
    if (
      url.origin !== "https://averianlabs-demo.netlify.app" &&
      !/^https:\/\/[a-f0-9]{24}--averianlabs-demo\.netlify\.app$/.test(url.origin)
    )
      throw new Error("Hosted evaluation is restricted to the approved review origin")
    if (env.AI_EVAL_COOKIE) throw new Error("Hosted review evaluation must be anonymous")
    return { origin: url.origin, kind: "hosted_review" as const }
  }
  const database = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !database ||
    !["localhost", "127.0.0.1"].includes(database.hostname) ||
    !env.TEST_DATABASE_URL ||
    env.TEST_DATABASE_URL !== env.DATABASE_URL
  )
    throw new Error("An isolated local target and matching local TEST_DATABASE_URL are required")
  return { origin: url.origin, kind: "isolated_local" as const }
}

export function assessResearchResponse(entry: ResearchEvalCase, status: number, body: string) {
  const events = body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .flatMap((line) => {
      try {
        return [JSON.parse(line.slice(6))]
      } catch {
        return []
      }
    })
  const answer = events
    .filter((event) => event.type === "text")
    .map((event) => event.delta)
    .join("")
  const toolResults = events.filter((event) => event.type === "tool-result")
  const calculations = toolResults.flatMap((event) =>
    event.content?.calculation ? [event.content.calculation] : [],
  )
  const expected = entry.calculation ? calculateLaboratory(entry.calculation) : null
  const numericalCorrectness =
    !expected ||
    calculations.some((calculation) =>
      Object.entries(expected.values).every(
        ([key, value]) =>
          typeof calculation.values?.[key] === "number" &&
          Math.abs(calculation.values[key] - value) <= 1e-8 * Math.max(1, Math.abs(value)),
      ),
    )
  const invalidSuccess = Boolean(entry.mustAbstain && calculations.length > 0)
  const completed =
    status >= 200 &&
    status < 300 &&
    answer.trim().length > 0 &&
    events.some((event) => event.type === "done") &&
    !events.some((event) => event.type === "error" || event.type === "action")
  return {
    id: entry.id,
    locale: entry.locale,
    prompt: entry.prompt,
    status,
    completed,
    numericalCorrectness,
    invalidSuccess,
    assessment: {
      taskCompletion: completed ? "runtime_completed" : "incomplete",
      numericalCorrectness: expected ? (numericalCorrectness ? "pass" : "fail") : "not_applicable",
      factualSupport: "pending_editorial_review",
      citationValidity: "pending_source_review",
      languageQuality: "pending_finnish_english_editorial_review",
      abstention: entry.mustAbstain ? "pending_answer_review" : "not_applicable",
    },
    answer,
    toolNames: toolResults.map((event) => event.name),
    toolResults,
    citations: events.filter((event) => event.type === "citations").flatMap((e) => e.citations),
    errors: events.filter((event) => event.type === "error"),
  }
}
