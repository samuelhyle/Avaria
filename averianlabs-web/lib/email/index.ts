import { getServerEnv } from "@/lib/env"
import type { Locale } from "@/lib/i18n/config"
import { logger } from "@/lib/logger"
import { getSiteUrl } from "@/lib/site"
import { getTranslations } from "next-intl/server"
import { Resend } from "resend"

/** Escapes user-controlled values before interpolating them into HTML emails. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

let _resend: Resend | null = null

function getResend(): Resend | null {
  const key = getServerEnv().RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const FROM_EMAIL = getServerEnv().RESEND_FROM_EMAIL ?? "AverianLabs <orders@averianlabs.eu>"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailOptions): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    logger.warn("[email] Resend not configured — skipping email to", to)
    return false
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: replyTo ?? "support@averianlabs.eu",
    })
    return true
  } catch (err) {
    logger.error("[email] Failed to send:", err)
    return false
  }
}

/** Loads the email namespace for the given locale, falling back to English. */
async function loadEmailTranslations(locale: string) {
  return getTranslations({ locale, namespace: "email" })
}

const HEAD = (tagline: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">${escapeHtml(tagline)}</p>
    </div>`

const HEAD_NO_TAGLINE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
    </div>`

const FOOTER = (footer: string) => `
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      ${escapeHtml(footer)}
    </p>
  </div>
</body>
</html>`

export async function verifyEmailHtml(opts: { url: string; locale: Locale }): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `${HEAD(t("tagline"))}
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("confirmEmailTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("confirmEmailBody"))}
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("confirmEmailCta"))}
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        ${escapeHtml(t("confirmEmailIgnore"))}
      </p>
    </div>
    ${FOOTER(t("footer"))}`
}

export async function passwordResetHtml(opts: { url: string; locale: Locale }): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `${HEAD_NO_TAGLINE}
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("resetPasswordTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("resetPasswordBody"))}
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("resetPasswordCta"))}
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        ${escapeHtml(t("resetPasswordIgnore"))}
      </p>
    </div>
    ${FOOTER(t("footer"))}`
}

export async function accountDeletionHtml(opts: { url: string; locale: Locale }): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `${HEAD_NO_TAGLINE}
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("deleteAccountTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("deleteAccountBody"))}
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("deleteAccountCta"))}
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        ${escapeHtml(t("deleteAccountIgnore"))}
      </p>
    </div>
    ${FOOTER(t("footer"))}`
}

export async function newsletterConfirmHtml(opts: {
  url: string
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `${HEAD_NO_TAGLINE}
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("newsletterTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("newsletterBody"))}
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("newsletterCta"))}
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        ${escapeHtml(t("newsletterIgnore"))}
      </p>
    </div>
    ${FOOTER(t("footer"))}`
}

export async function contactNotificationHtml(opts: {
  name: string
  email: string
  subject: string
  message: string
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:18px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("contactNotificationTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        <strong>${escapeHtml(opts.name)}</strong> &lt;${escapeHtml(opts.email)}&gt;
      </p>
      <p style="font-size:14px;color:#0f1e50;margin-top:16px;"><strong>${escapeHtml(opts.subject)}</strong></p>
      <p style="font-size:14px;color:#374151;margin-top:8px;white-space:pre-wrap;">${escapeHtml(opts.message)}</p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      ${escapeHtml(t("contactFooter"))}
    </p>
  </div>
</body>
</html>`
}

export async function orderConfirmationHtml(opts: {
  orderNumber: string
  email: string
  items: Array<{ name: string; mg: number; qty: number; priceCents: number }>
  subtotalCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  const itemRows = opts.items
    .map(
      (i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #eee;font-size:14px;">
        ${escapeHtml(i.name)} ${i.mg}mg
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:center;">
        ${i.qty}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">
        €${((i.priceCents * i.qty) / 100).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("")

  return `${HEAD(t("tagline"))}

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="padding:24px;border-bottom:1px solid #e5e7eb;">
        <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("orderConfirmedTitle"))}</h2>
        <p style="font-size:14px;color:#6b7280;margin-top:4px;">
          ${escapeHtml(t("orderLabel", { number: opts.orderNumber })).replace(
            opts.orderNumber,
            `<span style="font-family:monospace;font-weight:600;">${escapeHtml(opts.orderNumber)}</span>`,
          )}
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">${escapeHtml(t("orderColumnProduct"))}</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">${escapeHtml(t("orderColumnQty"))}</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">${escapeHtml(t("orderColumnPrice"))}</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="padding:16px;background:#f9fafb;">
        <table style="width:100%;font-size:14px;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${escapeHtml(t("orderSubtotal"))}</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.subtotalCents / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${escapeHtml(t("orderShipping"))}</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.shippingCents / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${escapeHtml(t("orderVat"))}</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.vatCents / 100).toFixed(2)}</td>
          </tr>
          <tr style="font-weight:700;font-size:16px;">
            <td style="padding:8px 0;border-top:1px solid #e5e7eb;">${escapeHtml(t("orderTotal"))}</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid #e5e7eb;">€${(opts.totalCents / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="margin-top:24px;padding:16px;background:white;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        <strong>${escapeHtml(t("orderWhatsNext"))}</strong> ${escapeHtml(t("orderWhatsNextBody"))}
      </p>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      ${escapeHtml(t("footer"))}<br>
      ${escapeHtml(t("orderFooter")).replace("{email}", escapeHtml(opts.email))}
    </p>
  </div>
</body>
</html>`
}

export async function shippingConfirmationHtml(opts: {
  orderNumber: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  return `${HEAD_NO_TAGLINE}

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("shippingTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">
        ${escapeHtml(t("orderLabel", { number: opts.orderNumber })).replace(
          opts.orderNumber,
          `<span style="font-family:monospace;font-weight:600;">${escapeHtml(opts.orderNumber)}</span>`,
        )}
      </p>

      <div style="margin-top:16px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="font-size:14px;margin:0;">
          <strong>${escapeHtml(opts.carrier)}</strong><br>
          ${escapeHtml(t("shippingTracking"))}: <span style="font-family:monospace;">${escapeHtml(opts.trackingNumber)}</span>
        </p>
        ${opts.trackingUrl ? `<a href="${escapeHtml(opts.trackingUrl)}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#2563eb;color:white;border-radius:6px;font-size:13px;text-decoration:none;">${escapeHtml(t("shippingTrack"))}</a>` : ""}
      </div>
    </div>

    ${FOOTER(t("footer"))}`
}

export async function reviewRequestHtml(opts: {
  orderNumber: string
  customerName: string
  items: Array<{ name: string; mg: number }>
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  const itemNames = opts.items.map((i) => `${escapeHtml(i.name)} ${i.mg}mg`).join(", ")
  const reviewUrl = `${getSiteUrl()}/${opts.locale}/account/orders`

  return `${HEAD(t("tagline"))}

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("reviewRequestTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("reviewRequestGreeting", { name: opts.customerName, order: opts.orderNumber, items: itemNames }))}
      </p>
      <p style="font-size:14px;color:#6b7280;margin-top:12px;">
        ${escapeHtml(t("reviewRequestBody"))}
      </p>

      <div style="margin-top:20px;text-align:center;">
        <a href="${reviewUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("reviewRequestCta"))}
        </a>
      </div>

      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#166534;margin:0;">
          <strong>${escapeHtml(t("reviewRequestWhatToReview"))}:</strong> ${escapeHtml(t("reviewRequestWhatToReviewBody"))}
        </p>
      </div>
    </div>

    <div style="margin-top:24px;padding:16px;background:white;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        <strong>${escapeHtml(t("reviewRequestNeedHelp"))}</strong> ${escapeHtml(t("reviewRequestNeedHelpBody"))}
      </p>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      ${escapeHtml(t("footer"))}<br>
      ${escapeHtml(t("reviewRequestFooter"))}
    </p>
  </div>
</body>
</html>`
}

export async function abandonedCartHtml(opts: {
  customerEmail: string
  items: Array<{ name: string; mg: number; priceCents: number }>
  locale: Locale
}): Promise<string> {
  const t = await loadEmailTranslations(opts.locale)
  const cartUrl = `${getSiteUrl()}/${opts.locale}/checkout/cart`
  const itemRows = opts.items
    .map(
      (i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #eee;font-size:14px;">
        ${escapeHtml(i.name)} ${i.mg}mg
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">
        €${(i.priceCents / 100).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("")

  return `${HEAD(t("tagline"))}

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">${escapeHtml(t("cartRecoveryTitle"))}</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        ${escapeHtml(t("cartRecoveryBody"))}
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:20px;text-align:center;">
        <a href="${cartUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(t("cartRecoveryCta"))}
        </a>
      </div>

      <div style="margin-top:16px;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
        <p style="font-size:13px;color:#1e40af;margin:0;">
          <strong>${escapeHtml(t("cartRecoveryFreeShipping"))}</strong> ${escapeHtml(t("cartRecoveryFreeShippingBody"))}
        </p>
      </div>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      ${escapeHtml(t("footer"))}<br>
      ${escapeHtml(t("cartRecoveryFooter"))}
    </p>
  </div>
</body>
</html>`
}
