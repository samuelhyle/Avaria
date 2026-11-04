import {
  batches,
  documents,
  productTranslations,
  productWaitlist,
  products,
  vials,
} from "@/db/schema"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import { escapeHtml } from "@/lib/email/html"
import { enqueueEmail } from "@/lib/email/outbox"
import { siteOrigin } from "@/lib/seo/site-origin"
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm"

/**
 * Telling a waiting shopper that the lot has arrived.
 *
 * The product page says "we will email you when a lot is released". This is
 * the code that sends that mail: when a batch is released and reviewed, the
 * addresses that asked for that SKU are written to once, and each one is
 * marked as notified so the next sweep does not write to them again.
 *
 * A batch only counts when its certificate of analysis is published. The
 * promise the shopper was given is the one the storefront can keep — a lot
 * without an openable certificate is not yet something to order.
 */

const copy = {
  en: {
    subject: (name: string) => `${name} is available again`,
    title: (name: string) => `${name} is available again`,
    body: (batch: string) =>
      `A new lot of ${name} has been released and its certificate of analysis is published. The batch is ${batch}. You asked to be told when this became available.`,
    button: "Open the product",
    footer:
      "You are receiving this because you asked to be notified when this product became available. For research use only.",
  },
  fi: {
    subject: (name: string) => `${name} on taas saatavilla`,
    title: (name: string) => `${name} on taas saatavilla`,
    body: (batch: string) =>
      `${name}-tuotteen uusi erä on julkaistu ja sen analyysitodistus on julkinen. Erä on ${batch}. Pyysit ilmoitettavan, kun tuote olisi saatavilla.`,
    button: "Avaa tuote",
    footer:
      "Saat tämän viestin, koski pyysit ilmoitettavan, kun tuote olisi saatavilla. Vain tutkimuskäyttöön.",
  },
} as const

function copyFor(locale?: string | null) {
  return locale === "fi" ? copy.fi : copy.en
}

export interface ReleaseNotificationResult {
  batches: number
  notified: number
}

/**
 * Notify the addresses that asked for a released lot.
 *
 * The window is deliberately short: a lot released a month ago is not news,
 * and the shopper who asked then has long since bought it or gone.
 */
export async function notifyReleasedBatches(sinceHours = 72): Promise<ReleaseNotificationResult> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000)
  const released = await db
    .select({
      id: batches.id,
      code: batches.code,
      vialId: batches.vialId,
      reviewedAt: batches.reviewedAt,
    })
    .from(batches)
    .where(
      and(
        eq(batches.verificationStatus, "released"),
        isNotNull(batches.reviewedBy),
        isNotNull(batches.reviewedAt),
        gte(batches.reviewedAt, since),
      ),
    )
  if (!released.length) return { batches: 0, notified: 0 }

  const vialIds = released.map((batch) => batch.vialId)
  const vialRows = await db
    .select({ id: vials.id, sku: vials.sku, productId: vials.productId })
    .from(vials)
    .where(inArray(vials.id, vialIds))
  const skusByVial = new Map(vialRows.map((vial) => [vial.id, vial]))
  if (!vialRows.length) return { batches: released.length, notified: 0 }

  const productIds = [...new Set(vialRows.map((vial) => vial.productId))]
  const productRows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(inArray(products.id, productIds))
  const productById = new Map(productRows.map((product) => [product.id, product]))

  const translationRows = await db
    .select({
      productId: productTranslations.productId,
      locale: productTranslations.locale,
      name: productTranslations.name,
    })
    .from(productTranslations)
    .where(eq(productTranslations.locale, "en"))
  const nameByProduct = new Map(translationRows.map((row) => [row.productId, row.name]))

  const documentRows = await db
    .select({
      batchId: documents.batchId,
      requiresLogin: documents.requiresLogin,
      externalUrl: documents.externalUrl,
      fileR2Key: documents.fileR2Key,
    })
    .from(documents)
    .where(eq(documents.type, "coa"))
  const documented = new Set(
    documentRows.filter((doc) => doc.batchId && publicDocumentUrl(doc)).map((doc) => doc.batchId),
  )

  const origin = siteOrigin()
  let notified = 0

  for (const batch of released) {
    if (!documented.has(batch.id)) continue
    const vial = skusByVial.get(batch.vialId)
    if (!vial) continue
    const product = productById.get(vial.productId)
    if (!product) continue
    const entries = await db
      .select()
      .from(productWaitlist)
      .where(and(eq(productWaitlist.sku, vial.sku), eq(productWaitlist.status, "open")))
    if (!entries.length) continue
    const productName = nameByProduct.get(vial.productId) ?? product.slug
    for (const entry of entries) {
      const text = copyFor(entry.locale)
      const url = `${origin}/${entry.locale === "en" ? "en" : entry.locale}/shop/${product.slug}`
      await enqueueEmail(
        {
          to: entry.email,
          subject: text.subject(productName),
          html: `<!doctype html><html lang="${entry.locale === "fi" ? "fi" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:system-ui;line-height:1.6;padding:24px;color:#182332"><main style="max-width:600px;margin:auto"><p>AverianLabs</p><h1>${escapeHtml(text.title(productName))}</h1><p>${escapeHtml(text.body(batch.code))}</p><p><a href="${escapeHtml(url)}">${escapeHtml(text.button)}</a></p><p style="font-size:12px">${escapeHtml(text.footer)}</p></main></body></html>`,
        },
        `waitlist:${entry.id}`,
      )
      await db
        .update(productWaitlist)
        .set({ status: "notified", notifiedAt: new Date() })
        .where(eq(productWaitlist.id, entry.id))
      notified += 1
    }
  }

  return { batches: released.length, notified }
}
