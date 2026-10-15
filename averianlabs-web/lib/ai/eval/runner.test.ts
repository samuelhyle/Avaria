import { describe, expect, it } from "vitest"
import { researchGuidance } from "../answers/guidance"
import { RESEARCH_EVAL_CASES } from "./research-cases"
import { assessResearchResponse, validateEvaluationTarget } from "./runner"

describe("live evaluation evidence", () => {
  const entry = RESEARCH_EVAL_CASES.find((item) => item.id === "concentration")
  if (!entry) throw new Error("Concentration evaluation case missing")
  const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`
  const text = event({ type: "text", delta: "5 mg/mL" })
  it("retains a truncated answer as incomplete even with a correct numerical result", () => {
    const calculation = event({
      type: "tool-result",
      name: "calculateLaboratory",
      content: {
        calculation: { values: { concentrationMgPerMl: 5, concentrationMcgPerMl: 5000 } },
      },
    })
    expect(assessResearchResponse(entry, 200, calculation + text).completed).toBe(false)
    const complete = assessResearchResponse(
      entry,
      200,
      calculation + text + event({ type: "done" }),
    )
    expect(complete.completed).toBe(true)
    expect(complete.numericalCorrectness).toBe(true)
    expect(complete.toolResults).toHaveLength(1)
    expect(complete.assessment.factualSupport).toBe("pending_editorial_review")
  })
  it("rejects missing numerical tools and explicit stream errors", () => {
    const result = assessResearchResponse(
      entry,
      200,
      text + event({ type: "error", message: "failed" }) + event({ type: "done" }),
    )
    expect(result.completed).toBe(false)
    expect(result.numericalCorrectness).toBe(false)
  })
  it("requires the relevant reviewed topic for scientific guidance rather than a plausible model-only answer", () => {
    const entry = RESEARCH_EVAL_CASES.find((item) => item.id === "upward-dilution")
    if (!entry) throw new Error()
    const done = event({ type: "done" })
    expect(assessResearchResponse(entry, 200, text + done).guidanceCorrectness).toBe(false)
    const tool = event({
      type: "tool-result",
      name: "getResearchGuidance",
      content: { topic: "dilution_limit" },
    })
    expect(assessResearchResponse(entry, 200, tool + text + done).guidanceCorrectness).toBe(false)
    const reviewed = event({
      type: "text",
      delta: researchGuidance("dilution_limit", entry.locale).text,
    })
    expect(assessResearchResponse(entry, 200, tool + reviewed + done).guidanceCorrectness).toBe(
      true,
    )
  })
  it("keeps hosted evaluation anonymous and restricted to the review origin", () => {
    const env = { AI_EVAL_TARGET: "review", BASE_URL: "https://averianlabs-demo.netlify.app" }
    expect(validateEvaluationTarget(env).kind).toBe("hosted_review")
    expect(
      validateEvaluationTarget({
        ...env,
        BASE_URL: "https://6acfdd709ba5414797142d54--averianlabs-demo.netlify.app",
      }).kind,
    ).toBe("hosted_review")
    expect(() => validateEvaluationTarget({ ...env, AI_EVAL_COOKIE: "session" })).toThrow()
    expect(() => validateEvaluationTarget({ ...env, BASE_URL: "https://averianlabs.eu" })).toThrow()
    expect(() =>
      validateEvaluationTarget({ ...env, BASE_URL: "https://averianlabs-demo.netlify.app/api" }),
    ).toThrow()
  })
  it("refuses a remote database behind a local API target", () => {
    expect(() =>
      validateEvaluationTarget({
        BASE_URL: "http://localhost:3217",
        DATABASE_URL: "postgres://example.com/merchant",
        TEST_DATABASE_URL: "postgres://example.com/merchant",
      }),
    ).toThrow()
  })
})
