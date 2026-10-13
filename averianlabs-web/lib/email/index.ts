import { logger } from "@/lib/logger"
import { Resend } from "resend"

import { escapeHtml } from "./html"
import { type OrderReceiptInput, renderOrderReceipt } from "./receipt"
export { escapeHtml } from "./html"

let _resend: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "AverianLabs <orders@averianlabs.eu>"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
  idempotencyKey?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  idempotencyKey,
}: SendEmailOptions): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    logger.warn("[email] Resend not configured — skipping email to", to)
    return false
  }

  try {
    const result = await resend.emails.send(
      {
        from: FROM_EMAIL,
        to,
        subject,
        html,
        replyTo: replyTo ?? "support@averianlabs.eu",
      },
      { idempotencyKey },
    )
    if (result.error) {
      logger.error("[email] provider rejected delivery", result.error)
      return false
    }
    return true
  } catch (err) {
    logger.error("[email] Failed to send:", err)
    return false
  }
}

type EmailLocale = { locale?: string }
const emailCopy = {
  en: {
    verify: [
      "Confirm your AverianLabs account",
      "Confirm your email",
      "Confirm this address. The link expires in 24 hours.",
      "Confirm email",
    ],
    reset: [
      "Reset your AverianLabs password",
      "Reset your password",
      "The password reset link expires in one hour. Your password changes only after you submit a new one.",
      "Reset password",
    ],
    deletion: [
      "Confirm account deletion",
      "Confirm account deletion",
      "Open the link to review and confirm deletion. Confirmation immediately disables your account and removes or anonymises personal profile data. Required order records are retained. There is no account restoration period. The link expires in 24 hours.",
      "Review deletion",
    ],
    newsletter: [
      "Confirm your subscription",
      "Confirm your subscription",
      "Confirm this address to receive optional AverianLabs updates. The link expires in 24 hours. Contact support to withdraw your consent at any time.",
      "Confirm subscription",
    ],
    ignore: "If you did not request this, you can ignore this email.",
    footer: "For laboratory research only.",
    shipped: "Your order has shipped",
    tracking: "Track shipment",
    feedback: "Feedback about your order",
    feedbackBody: "Contact us if you have questions or feedback about this order.",
    contact: "Contact support",
    cart: "Review your cart",
    cartBody: "Check current availability, prices and shipping at checkout.",
  },
  fi: {
    verify: [
      "Vahvista AverianLabs-tilisi",
      "Vahvista sähköpostiosoitteesi",
      "Vahvista tämä sähköpostiosoite. Linkki on voimassa 24 tuntia.",
      "Vahvista sähköposti",
    ],
    reset: [
      "Vaihda AverianLabs-salasanasi",
      "Vaihda salasanasi",
      "Salasanan vaihtolinkki on voimassa tunnin. Salasana muuttuu vasta, kun olet tallentanut uuden salasanan.",
      "Vaihda salasana",
    ],
    deletion: [
      "Vahvista tilin poistaminen",
      "Vahvista tilin poistaminen",
      "Avaa linkki tarkistaaksesi ja vahvistaaksesi poistamisen. Vahvistaminen sulkee tilisi heti ja poistaa tai anonymisoi henkilökohtaiset profiilitiedot. Lakisääteisesti säilytettävät tilaustiedot säilyvät. Tiliä ei voi palauttaa. Linkki on voimassa 24 tuntia.",
      "Tarkista poistaminen",
    ],
    newsletter: [
      "Vahvista uutiskirjeen tilaus",
      "Vahvista uutiskirjeen tilaus",
      "Vahvista tämä osoite saadaksesi AverianLabsin vapaaehtoisia päivityksiä. Linkki on voimassa 24 tuntia. Voit perua suostumuksesi milloin tahansa ottamalla yhteyttä tukeen.",
      "Vahvista tilaus",
    ],
    ignore: "Jos et tehnyt tätä pyyntöä, voit jättää viestin huomiotta.",
    footer: "Vain laboratoriotutkimukseen.",
    shipped: "Tilauksesi on lähetetty",
    tracking: "Seuraa lähetystä",
    feedback: "Palaute tilauksestasi",
    feedbackBody: "Ota yhteyttä, jos sinulla on kysyttävää tai palautetta tästä tilauksesta.",
    contact: "Ota yhteyttä tukeen",
    cart: "Tarkista ostoskorisi",
    cartBody: "Tarkista ajantasainen saatavuus, hinnat ja toimitus kassalla.",
  },
} as const
export type ActionEmailKind = "verify" | "reset" | "deletion" | "newsletter"
const copyFor = (locale?: string) => emailCopy[locale === "fi" ? "fi" : "en"]
export const actionEmailSubject = (kind: ActionEmailKind, locale?: string) =>
  copyFor(locale)[kind][0]
function emailShell(title: string, content: string, locale?: string) {
  return `<!doctype html><html lang="${locale === "fi" ? "fi" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:system-ui;line-height:1.6;padding:24px;color:#182332"><main style="max-width:600px;margin:auto"><p>AverianLabs</p><h1>${escapeHtml(title)}</h1>${content}<p style="font-size:12px">${copyFor(locale).footer}</p></main></body></html>`
}
function actionHtml(kind: ActionEmailKind, opts: EmailLocale & { url: string }) {
  const copy = copyFor(opts.locale)
  const [, title, body, button] = copy[kind]
  return emailShell(
    title,
    `<p>${body}</p><p><a href="${escapeHtml(opts.url)}">${button}</a></p><p>${copy.ignore}</p>`,
    opts.locale,
  )
}
export const verifyEmailHtml = (opts: EmailLocale & { url: string }) => actionHtml("verify", opts)
export const passwordResetHtml = (opts: EmailLocale & { url: string }) => actionHtml("reset", opts)
export const accountDeletionHtml = (opts: EmailLocale & { url: string }) =>
  actionHtml("deletion", opts)
export const newsletterConfirmHtml = (opts: EmailLocale & { url: string }) =>
  actionHtml("newsletter", opts)
export function contactNotificationHtml(opts: {
  name: string
  email: string
  subject: string
  message: string
  locale?: string
}): string {
  return emailShell(
    opts.subject,
    `<p>${escapeHtml(opts.name)} &lt;${escapeHtml(opts.email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(opts.message)}</p>`,
    opts.locale,
  )
}
export function orderConfirmationHtml(opts: OrderReceiptInput): string {
  return renderOrderReceipt(opts)
}
export function shippingConfirmationHtml(
  opts: EmailLocale & {
    orderNumber: string
    carrier: string
    trackingNumber: string
    trackingUrl?: string
  },
): string {
  const copy = copyFor(opts.locale)
  return emailShell(
    copy.shipped,
    `<p>${escapeHtml(opts.orderNumber)}</p><p>${escapeHtml(opts.carrier)} · ${escapeHtml(opts.trackingNumber)}</p>${opts.trackingUrl && /^https:\/\//.test(opts.trackingUrl) ? `<p><a href="${escapeHtml(opts.trackingUrl)}">${copy.tracking}</a></p>` : ""}`,
    opts.locale,
  )
}
