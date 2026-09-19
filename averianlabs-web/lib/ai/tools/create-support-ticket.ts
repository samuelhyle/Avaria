/**
 * createSupportTicket — fallback path when Averia can't resolve a question.
 *
 * Files a row in `support_tickets` with the last 20 conversation turns as a
 * JSON transcript, and returns a confirmation message + a ticket id. The
 * transcript is supplied by the agent loop as a parameter — the tool itself
 * is stateless.
 */

import { supportTickets } from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { safeUuid } from "@/lib/utils/uuid"

interface Turn {
  role: "user" | "assistant"
  content: string
  at: string
}

interface Args {
  email: string
  subject: string
  body: string
  /** Last 20 turns. Optional — the agent loop attaches `ctx.transcript`. */
  transcript?: Turn[]
  /** The conversation id, if available — used for traceability. */
  conversationId?: string
}

const CONFIRMATIONS: Record<string, string> = {
  en: "I've created a support ticket and attached our conversation. A specialist will follow up within 24 hours at the email you provided.",
  fi: "Olen luonut tukipyynnön ja liittänyt keskustelumme siihen. Asiantuntija vastaa 24 tunnin sisällä antamaasi sähköpostiin.",
  de: "Ich habe ein Support-Ticket erstellt und unser Gespräch angehängt. Ein Spezialist meldet sich innerhalb von 24 Stunden unter der angegebenen E-Mail.",
  sv: "Jag har skapat ett supportärende och bifogat vår konversation. En specialist återkommer inom 24 timmar till den angivna e-posten.",
  nl: "Ik heb een supportticket aangemaakt en ons gesprek bijgevoegd. Een specialist reageert binnen 24 uur op het opgegeven e-mailadres.",
}

export const createSupportTicketTool: Tool = {
  definition: {
    name: "createSupportTicket",
    description:
      "File a support ticket with the user's last 20 conversation turns as a transcript. Use this when the agent cannot resolve the question in-line and the user wants human follow-up. Returns a ticket id and a localized confirmation.",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email for the specialist to reach the user." },
        subject: { type: "string", description: "Short subject — usually a 5–10 word summary." },
        body: {
          type: "string",
          description:
            "Free-form context: what the user asked, what was tried, what to follow up on.",
        },
        transcript: {
          type: "array",
          description:
            "Ignored — the runtime attaches the last 20 conversation turns automatically.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
              at: { type: "string" },
            },
            required: ["role", "content", "at"],
          },
        },
        conversationId: {
          type: "string",
          description: "Averia conversation id this ticket belongs to. Optional.",
        },
      },
      required: ["email", "subject", "body"],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args

    // Treat every input as potentially hostile — Zod lives one layer up but
    // the tool surface itself doesn't enforce schema, and a hallucinated
    // tool call from a confused model can hand us `email: 42` or
    // `body: undefined`.
    const email = typeof args.email === "string" ? args.email.trim() : ""
    const subject = typeof args.subject === "string" ? args.subject.trim() : ""
    const body = typeof args.body === "string" ? args.body : ""

    if (!email || !subject || !body) {
      return { content: { error: "missing_inputs", required: ["email", "subject", "body"] } }
    }

    if (!isPlausibleEmail(email)) {
      return { content: { error: "invalid_email" } }
    }

    const transcript = args.transcript?.length ? args.transcript : (ctx.transcript ?? [])
    if (transcript.length === 0) {
      return { content: { error: "empty_transcript" } }
    }

    const id = `t-${safeUuid()}`
    const trimmedTranscript = transcript.slice(-20)

    try {
      await db.insert(supportTickets).values({
        id,
        userId: ctx.auth?.userId ?? null,
        conversationId: args.conversationId ?? ctx.conversationId ?? null,
        email: email.toLowerCase(),
        subject: subject.slice(0, 200),
        body: body.slice(0, 4000),
        source: "averia",
        status: "open",
        locale: ctx.locale,
        transcript: trimmedTranscript,
      })
    } catch (err) {
      logger.error("[averia] ticket insert failed", err)
      return { content: { error: "ticket_failed" } }
    }

    const confirmation = CONFIRMATIONS[ctx.locale] ?? CONFIRMATIONS.en
    return {
      content: {
        ok: true,
        ticketId: id,
        confirmation,
      },
    }
  },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isPlausibleEmail(value: string): boolean {
  return value.length <= 320 && EMAIL_RE.test(value)
}
