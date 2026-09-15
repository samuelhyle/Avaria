/**
 * rememberPreference — propose saving a durable user preference.
 *
 * The tool never writes itself: it returns a `proposedAction` and the UI asks
 * the user to confirm. On confirmation the client PUTs `/api/ai/memory`
 * (consent-gated, size-bounded server-side).
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"

interface Args {
  key: string
  value: string
}

const ALLOWED_KEY = /^[a-z0-9_-]{2,64}$/i

export const rememberPreferenceTool: Tool = {
  definition: {
    name: "rememberPreference",
    description:
      "Propose saving a durable preference the user has stated about themselves (e.g. preferred vial size, research area, locale). The UI asks the user to confirm; never claim it is saved before confirmation. Do not store contact details, health data, or anything sensitive.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Short stable key, e.g. 'preferred_vial_mg' or 'research_area'.",
        },
        value: {
          type: "string",
          description: "Human-readable value, e.g. '5 mg vials' or 'tissue recovery'.",
        },
      },
      required: ["key", "value"],
    },
  },
  async execute(rawArgs, _ctx: ToolContext): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Partial<Args>
    const key = typeof args.key === "string" ? args.key.trim() : ""
    const value = typeof args.value === "string" ? args.value.trim().slice(0, 200) : ""

    if (!key || !value) {
      return { content: { error: "missing_inputs", required: ["key", "value"] } }
    }
    if (!ALLOWED_KEY.test(key)) {
      return { content: { error: "invalid_key" } }
    }

    return {
      content: { ok: true, pendingConfirmation: true, key, value },
      proposedAction: { kind: "remember", key, value },
    }
  },
}
