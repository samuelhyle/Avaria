import { formatCurrency, formatSize } from "@/lib/utils/format"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { escapeHtml } from "./html"

export interface OrderReceiptInput {
  orderNumber: string
  email: string
  locale?: string
  orderUrl?: string
  items: Array<{
    name: string
    sku?: string
    batchCode?: string
    sizeValue: number
    sizeUnit: string
    qty: number
    priceCents: number
  }>
  documents?: Array<{ title: string; url: string }>
  subtotalCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
}

export function renderOrderReceipt(opts: OrderReceiptInput): string {
  const locale = opts.locale === "fi" ? "fi" : "en"
  const t = (locale === "fi" ? fi : en).research
  const money = (cents: number) => escapeHtml(formatCurrency(cents, "EUR", locale))
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;color:#182338"><main style="max-width:640px;margin:auto;padding:24px"><h1>AverianLabs</h1><h2>${t.paidTitle}</h2><p>${t.orderNumber}: ${escapeHtml(opts.orderNumber)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">${t.product}</th><th>×</th><th>${t.total}</th></tr></thead><tbody>${opts.items.map((item) => `<tr><td style="padding:12px 0">${escapeHtml(item.name)} · ${escapeHtml(formatSize(item, locale))}<br><small>${escapeHtml(item.sku ?? "")}${item.batchCode ? ` · ${t.batch}: ${escapeHtml(item.batchCode)}` : ""}</small></td><td>${item.qty}</td><td style="text-align:right">${money(item.priceCents * item.qty)}</td></tr>`).join("")}</tbody></table><p>${t.subtotal}: ${money(opts.subtotalCents)}</p><p>${t.shipping}: ${money(opts.shippingCents)}</p><p>${t.vatIncluded.replace("{rate}", locale === "fi" ? "25,5 %" : "25.5%")}: ${money(opts.vatCents)}</p><p><strong>${t.total}: ${money(opts.totalCents)}</strong></p>${opts.orderUrl ? `<p><a href="${escapeHtml(opts.orderUrl)}">${t.summary}</a></p>` : ""}${opts.documents?.length ? `<h3>${t.includedDocuments}</h3><ul>${opts.documents.map((document) => `<li><a href="${escapeHtml(document.url)}">${escapeHtml(document.title)}</a></li>`).join("")}</ul>` : `<p>${t.noDocuments}</p>`}<p>${t.faqUseAnswer}</p></main></body></html>`
}
