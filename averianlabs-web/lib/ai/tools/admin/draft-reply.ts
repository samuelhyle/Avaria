/**
 * adminDraftReply — role-gated draft-response assistant.
 *
 * Generates a short, professional reply draft for a support ticket based on
 * the ticket's subject, body, and transcript. Used by the admin copilot
 * inside `/admin/averia` to speed up human response time.
 *
 * Implementation: small heuristic draft using MiniMax with a constrained
 * system prompt. Returns the draft text — the admin can copy/edit before
 * sending through the regular support workflow.
 */

import {
  type ChatMessagePayload,
  isMinimaxConfigured,
  streamMinimaxChat,
} from "@/lib/ai/providers/minimax"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { logger } from "@/lib/logger"

interface Turn {
  role: "user" | "assistant"
  content: string
}

interface Args {
  ticketId: string
  email: string
  subject: string
  body: string
  transcript?: Turn[]
  /** Optional tone override. */
  tone?: "warm" | "concise" | "technical"
}

const TONE_GUIDES: Record<string, Record<string, string>> = {
  warm: {
    en: "Warm, conversational. Acknowledge the frustration, then resolve.",
    fi: "Lämmin, keskusteleva. Tunnusta turhautuminen, sitten ratkaise.",
    de: "Warm, gesprächig. Frustration anerkennen, dann lösen.",
    sv: "Varm, samtalsvänlig. Bekräfta frustration, lös sedan.",
    nl: "Warm, conversationeel. Erken frustratie, los het dan op.",
  },
  concise: {
    en: "Concise. Lead with the resolution; brief acknowledgement only.",
    fi: "Tiivis. Aloita ratkaisulla; vain lyhyt huomio.",
    de: "Knapp. Lösung voran; kurze Anerkennung reicht.",
    sv: "Koncis. Lösningen först; bara kort bekräftelse.",
    nl: "Beknopt. Leid met de oplossing; korte erkenning.",
  },
  technical: {
    en: "Technical and precise. Cite batch IDs and lab data where relevant.",
    fi: "Tekninen ja täsmällinen. Mainitse erätunnukset ja laboratoriodata tarvittaessa.",
    de: "Technisch und präzise. Chargen-IDs und Labordaten zitieren.",
    sv: "Teknisk och exakt. Ange batch-ID och labbdata.",
    nl: "Technisch en precies. Vermeld batch-IDs en labgegevens.",
  },
}

export const adminDraftReplyTool: Tool = {
  definition: {
    name: "adminDraftReply",
    description:
      "Admin-only. Generate a short, professional reply draft for a support ticket. The draft is returned in the ticket's locale. Use this when the admin asks 'draft a reply to ticket T-123'.",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket id, used only for traceability in logs." },
        email: { type: "string", description: "Recipient email — used in the draft greeting." },
        subject: { type: "string", description: "Ticket subject." },
        body: { type: "string", description: "Ticket body (the customer's ask)." },
        transcript: {
          type: "array",
          description: "Optional transcript turns for context.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        tone: {
          type: "string",
          enum: ["warm", "concise", "technical"],
          description: "Tone override. Defaults to 'concise'.",
        },
      },
      required: ["ticketId", "email", "subject", "body"],
    },
  },
  requiresAdmin: true,
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    if (!isMinimaxConfigured()) {
      return { content: { error: "provider_unavailable" } }
    }

    const tone = args.tone ?? "concise"
    const toneGuides = TONE_GUIDES[tone]
    const toneGuide = toneGuides?.[ctx.locale] ?? toneGuides?.en ?? ""

    const transcriptBlock = (args.transcript ?? [])
      .slice(-20)
      .map((t) => `${t.role === "user" ? "Customer" : "Averia"}: ${t.content}`)
      .join("\n")

    const systemPrompt = `You are drafting a support reply on behalf of the AverianLabs team.
Locale: ${ctx.locale} (${ctx.locale}).
Tone: ${toneGuide}

Rules:
- Reply in the customer's locale.
- Be specific — reference batch codes, SKUs, lab names, or policy if relevant.
- 80–180 words. No bullet lists unless genuinely helpful.
- Sign off with: "— The AverianLabs team"
- Never promise a specific delivery date you can't verify.
- Never disclose internal staff names or pricing margins.
- Do not include a subject line — only the body.`

    const userMessage = `Ticket ${args.ticketId} (${ctx.locale}).
Subject: ${args.subject}

Customer's message:
${args.body}
${transcriptBlock ? `\nConversation transcript:\n${transcriptBlock}` : ""}

Draft a reply now.`

    const messages: ChatMessagePayload[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ]

    let draft = ""
    try {
      for await (const chunk of streamMinimaxChat({
        messages,
        temperature: 0.5,
        maxTokens: 400,
      })) {
        if (chunk.delta.content) draft += chunk.delta.content
      }
    } catch (err) {
      logger.error("[averia] draft-reply failed", err)
      return { content: { error: "draft_failed" } }
    }

    return {
      content: {
        ok: true,
        ticketId: args.ticketId,
        tone,
        draft: draft.trim(),
      },
    }
  },
}
