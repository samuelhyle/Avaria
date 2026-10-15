import { GUIDANCE_TOPICS, researchGuidance } from "@/lib/ai/answers/guidance"
import { z } from "zod"
import type { Tool } from "./registry"
const input = z.object({ topic: z.enum(GUIDANCE_TOPICS) }).strict()
export const researchGuidanceTool: Tool = {
  definition: {
    name: "getResearchGuidance",
    description:
      "REQUIRED for standard scientific or site-policy explanations. Choose nominal_content (nominal label vs measured peptide content), hplc_area_purity (chromatographic area vs mass), dilution_limit (why solvent addition cannot increase concentration), final_volume (solution vs added solvent), batch_evidence (missing reports, exact batch/report scope), molar_conversion (unsupported molarity/blend calculation), participation (points vs researcher credentials), community_review (human publication vs AI moderation/drafts), memory (explicit preferences vs conversation consent), or assistant_availability (static role label vs service health). Returns reviewed bilingual guidance, not product evidence or a preparation procedure. Use calculation tools for actual numerical problems and catalogue tools for actual product records.",
    parameters: {
      type: "object",
      properties: { topic: { type: "string", enum: [...GUIDANCE_TOPICS] } },
      required: ["topic"],
    },
  },
  async execute(raw, ctx) {
    const parsed = input.safeParse(raw)
    return {
      content: parsed.success
        ? researchGuidance(parsed.data.topic, ctx.locale)
        : { error: "unknown_guidance_topic" },
    }
  },
}
