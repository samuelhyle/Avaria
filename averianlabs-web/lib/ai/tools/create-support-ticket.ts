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

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const CONFIRMATIONS: Record<string, string> = {
  en: "I've created a support ticket and attached our conversation. Our team can follow up using the email you provided.",
  fi: "Olen luonut tukipyynnön ja liittänyt keskustelumme siihen. Tiimimme voi ottaa yhteyttä antamaasi sähköpostiin.",
  de: "Ich habe ein Support-Ticket erstellt und unser Gespräch angehängt. Unser Team kann Sie unter der angegebenen E-Mail kontaktieren.",
  sv: "Jag har skapat ett supportärende och bifogat vår konversation. Vårt team kan följa upp via den angivna e-postadressen.",
  nl: "Ik heb een supportticket aangemaakt en ons gesprek bijgevoegd. Ons team kan contact opnemen via het opgegeven e-mailadres.",
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

    if (!args.email || !args.subject || !args.body) {
      return { content: { error: "missing_inputs", required: ["email", "subject", "body"] } }
    }

    const transcript = ctx.transcript ?? []
    if (transcript.length === 0) {
      return { content: { error: "empty_transcript" } }
    }

    const id = `t-${uuid()}`
    const trimmedTranscript = transcript.slice(-20)

    try {
      await db.insert(supportTickets).values({
        id,
        userId: ctx.auth?.userId ?? null,
        conversationId: ctx.conversationId ?? null,
        email: args.email.toLowerCase(),
        subject: args.subject.slice(0, 200),
        body: args.body.slice(0, 4000),
        source: "averia",
        status: "open",
        locale: ctx.locale,
        transcript: trimmedTranscript,
      })
    } catch (err) {
      console.error("[averia] ticket insert failed", err)
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
