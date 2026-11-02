import { escapeHtml } from "@/lib/email/html"
import { getServerEnv } from "@/lib/env"
import { enqueueTelegramMessage } from "@/lib/telegram/outbox"

/**
 * The operations channel.
 *
 * A researcher who asks for a quote is the only kind of lead this store can
 * produce until the catalogue carries prices. That lead is queued as an
 * email, and the email is only delivered when a mail provider is configured
 * and working. If it is not, the request sits in the outbox and nobody
 * hears about it — the storefront looks busy and the inbox stays empty.
 *
 * Telegram is configured, durable and already flushed by the maintenance
 * cron, so a lead is also written there. The two channels are independent:
 * the owner gets the message by whichever way works, and neither one blocks
 * the other.
 */

export type OpsEvent = "quote" | "contact" | "partner"

/** The heading for each kind of event, in the language the visitor wrote in. */
const HEADINGS: Record<OpsEvent, { en: string; fi: string; sv: string; ru: string }> = {
  quote: {
    en: "Quote request",
    fi: "Tarjouspyyntö",
    sv: "Offertförfrågan",
    ru: "Запрос предложения",
  },
  contact: {
    en: "Contact form",
    fi: "Yhteydenottolomake",
    sv: "Kontaktformulär",
    ru: "Контактная форма",
  },
  partner: {
    en: "Partner application",
    fi: "Kumppanuushakemus",
    sv: "Partneransökan",
    ru: "Заявка на партнёрство",
  },
}

export interface OpsLead {
  event: OpsEvent
  locale: string
  name: string
  email: string
  /** The SKU, product or subject the visitor asked about. */
  subject: string
  organisation?: string
  message?: string
}

/**
 * Write a lead to the operations chat.
 *
 * Nothing is written when no operations chat is configured: an outbox row
 * nobody will read is worse than no row.
 */
export async function notifyOps(lead: OpsLead): Promise<void> {
  const chatId = getServerEnv().TELEGRAM_OPS_CHAT_ID
  if (!chatId) return

  const heading =
    HEADINGS[lead.event][lead.locale as keyof typeof HEADINGS.quote] ?? HEADINGS[lead.event].en
  const lines = [
    `<b>${escapeHtml(heading)}</b>`,
    `${escapeHtml(lead.name)}${lead.organisation ? ` · ${escapeHtml(lead.organisation)}` : ""}`,
    `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
    escapeHtml(lead.subject),
  ]
  if (lead.message) lines.push(`<i>${escapeHtml(lead.message)}</i>`)

  await enqueueTelegramMessage(
    { chatId, text: lines.join("\n") },
    `ops:${lead.event}:${lead.email}:${lead.subject}`,
  )
}
