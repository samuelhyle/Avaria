import { logger } from "@/lib/logger"
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

export function verifyEmailHtml(opts: { url: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">Precision peptides for serious research</p>
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Confirm your email</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        Confirm this address to activate your account. The link expires in 24 hours.
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Confirm email
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        If you didn't create an account, you can ignore this email.
      </p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only
    </p>
  </div>
</body>
</html>`
}

export function passwordResetHtml(opts: { url: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Reset your password</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        We received a request to reset your password. The link expires in 1 hour.
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Reset password
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only
    </p>
  </div>
</body>
</html>`
}

export function accountDeletionHtml(opts: { url: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Confirm account deletion</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        This will delete your account and personal data. You have 30 days to change your mind
        before it is permanently removed. The link expires in 24 hours.
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Confirm deletion
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        If you didn't request this, ignore this email — your account stays active.
      </p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only
    </p>
  </div>
</body>
</html>`
}

export function newsletterConfirmHtml(opts: { url: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Confirm your subscription</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        Confirm this address to receive batch releases, new COAs and research notes.
        The link expires in 24 hours.
      </p>
      <div style="margin-top:20px;text-align:center;">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Confirm subscription
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
        If you didn't request this, ignore this email — you won't be subscribed.
      </p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only
    </p>
  </div>
</body>
</html>`
}

export function contactNotificationHtml(opts: {
  name: string
  email: string
  subject: string
  message: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:18px;font-weight:600;color:#0f1e50;margin:0;">New contact form message</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        <strong>${escapeHtml(opts.name)}</strong> &lt;${escapeHtml(opts.email)}&gt;
      </p>
      <p style="font-size:14px;color:#0f1e50;margin-top:16px;"><strong>${escapeHtml(opts.subject)}</strong></p>
      <p style="font-size:14px;color:#374151;margin-top:8px;white-space:pre-wrap;">${escapeHtml(opts.message)}</p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · contact form · reply directly to this email
    </p>
  </div>
</body>
</html>`
}

export function orderConfirmationHtml(opts: {
  orderNumber: string
  email: string
  items: Array<{ name: string; mg: number; qty: number; priceCents: number }>
  subtotalCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
}): string {
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

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">Precision peptides for serious research</p>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="padding:24px;border-bottom:1px solid #e5e7eb;">
        <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Order confirmed</h2>
        <p style="font-size:14px;color:#6b7280;margin-top:4px;">
          Order <span style="font-family:monospace;font-weight:600;">${escapeHtml(opts.orderNumber)}</span>
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Product</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Qty</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="padding:16px;background:#f9fafb;">
        <table style="width:100%;font-size:14px;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Subtotal</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.subtotalCents / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Shipping</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.shippingCents / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">VAT (24%)</td>
            <td style="padding:4px 0;text-align:right;">€${(opts.vatCents / 100).toFixed(2)}</td>
          </tr>
          <tr style="font-weight:700;font-size:16px;">
            <td style="padding:8px 0;border-top:1px solid #e5e7eb;">Total</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid #e5e7eb;">€${(opts.totalCents / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="margin-top:24px;padding:16px;background:white;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        <strong>What's next?</strong> Your batch-specific Certificate of Analysis (COA), endotoxin report,
        and mass-spec confirmation will be available in your account once the order ships.
      </p>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only<br>
      This email was sent to ${escapeHtml(opts.email)}. Questions? Reply to this email or contact support@averianlabs.eu.
    </p>
  </div>
</body>
</html>`
}

export function shippingConfirmationHtml(opts: {
  orderNumber: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">Your order has shipped</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">
        Order <span style="font-family:monospace;font-weight:600;">${escapeHtml(opts.orderNumber)}</span>
      </p>

      <div style="margin-top:16px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="font-size:14px;margin:0;">
          <strong>${escapeHtml(opts.carrier)}</strong><br>
          Tracking: <span style="font-family:monospace;">${escapeHtml(opts.trackingNumber)}</span>
        </p>
        ${opts.trackingUrl ? `<a href="${escapeHtml(opts.trackingUrl)}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#2563eb;color:white;border-radius:6px;font-size:13px;text-decoration:none;">Track shipment</a>` : ""}
      </div>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only
    </p>
  </div>
</body>
</html>`
}

export function reviewRequestHtml(opts: {
  orderNumber: string
  customerName: string
  items: Array<{ name: string; mg: number }>
  locale: string
}): string {
  const itemNames = opts.items.map((i) => `${escapeHtml(i.name)} ${i.mg}mg`).join(", ")
  const reviewUrl = `https://averianlabs.eu/${opts.locale}/account/orders`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">Precision peptides for serious research</p>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">How did your peptides perform?</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        Hi ${escapeHtml(opts.customerName)}, your order <span style="font-family:monospace;font-weight:600;">${escapeHtml(opts.orderNumber)}</span> containing ${itemNames} was delivered a few days ago.
      </p>
      <p style="font-size:14px;color:#6b7280;margin-top:12px;">
        Your feedback helps other researchers make informed decisions and helps us maintain our quality standards. Would you take a minute to share your experience?
      </p>

      <div style="margin-top:20px;text-align:center;">
        <a href="${reviewUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Leave a review
        </a>
      </div>

      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#166534;margin:0;">
          <strong>What to review:</strong> Purity consistency, packaging quality, COA accuracy, delivery speed, or anything that stood out during your research.
        </p>
      </div>
    </div>

    <div style="margin-top:24px;padding:16px;background:white;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        <strong>Need help?</strong> Reply to this email or reach our support team at support@averianlabs.eu. We respond within 2 hours during business days.
      </p>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only<br>
      You received this because you placed an order with us. We won't email you again unless you ask us to.
    </p>
  </div>
</body>
</html>`
}

export function abandonedCartHtml(opts: {
  customerEmail: string
  items: Array<{ name: string; mg: number; priceCents: number }>
  locale: string
}): string {
  const cartUrl = `https://averianlabs.eu/${opts.locale}/checkout/cart`
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

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f1e50;margin:0;">AverianLabs</h1>
      <p style="font-size:14px;color:#6b7280;margin-top:4px;">Precision peptides for serious research</p>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
      <h2 style="font-size:20px;font-weight:600;color:#0f1e50;margin:0;">You left items in your cart</h2>
      <p style="font-size:14px;color:#6b7280;margin-top:8px;">
        You have research peptides waiting for you. Complete your order before stock runs low on your selected batch.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:20px;text-align:center;">
        <a href="${cartUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Complete your order
        </a>
      </div>

      <div style="margin-top:16px;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
        <p style="font-size:13px;color:#1e40af;margin:0;">
          <strong>Free EU shipping</strong> on orders over €150. Your cart may qualify.
        </p>
      </div>
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      AverianLabs · Helsinki, Finland · Research use only<br>
      You received this because you started an order at averianlabs.eu. We'll only send one reminder.
    </p>
  </div>
</body>
</html>`
}
