/** Approved live checkout fixture: no goods, batches, certificates or shipment. */
import crypto from "node:crypto"
import { categories, productTranslations, products, vials } from "@/db/schema"
import {
  CHECKOUT_TEST_MARKER,
  CHECKOUT_TEST_SKU,
  CHECKOUT_TEST_SLUG,
} from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"

if (process.env.CHECKOUT_TEST_PRODUCT_ENABLED !== "true")
  throw new Error("Explicit checkout test opt-in required")
const url = new URL(process.env.DATABASE_URL ?? "")
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) &&
  !(process.env.NETLIFY === "true" && process.env.URL === "https://averianlabs-demo.netlify.app")
)
  throw new Error("This fixture is restricted to local databases and the approved review site")

try {
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(products).where(eq(products.slug, CHECKOUT_TEST_SLUG))
    if (old && (old.specJson as { evidenceRef?: string })?.evidenceRef !== CHECKOUT_TEST_MARKER)
      throw new Error("Refusing to overwrite an unowned product")
    const [category] = await tx.select().from(categories).where(eq(categories.slug, "supplies"))
    if (!category) throw new Error("Run the reference seed first")
    const id = old?.id ?? crypto.randomUUID()
    const values = {
      categoryId: category.id,
      productType: "supplies",
      status: "active",
      specJson: { verified: false, checkoutTest: true, evidenceRef: CHECKOUT_TEST_MARKER },
      updatedAt: new Date(),
    }
    if (old) await tx.update(products).set(values).where(eq(products.id, id))
    else await tx.insert(products).values({ id, slug: CHECKOUT_TEST_SLUG, ...values })
    for (const locale of ["en", "fi", "sv", "ru"]) {
      const copy =
        locale === "fi"
          ? {
              name: "Kassan testituote — 1,50 €",
              tagline: "Vain maksuprosessin testaukseen. Ei toimitusta.",
              description:
                "Kassan testituote. Yhteensä 1,50 €. Ei fyysistä tuotetta tai toimitusta. Osta yksi erikseen ilman alennuskoodia.",
            }
          : {
              name: "Checkout test — €1.50",
              tagline: "Payment flow test only. No goods or delivery.",
              description:
                "A checkout test only. €1.50 total, with no physical goods or shipment. Buy one separately without a discount code. Paying this invoice transfers real money.",
            }
      const [translation] = await tx
        .select()
        .from(productTranslations)
        .where(and(eq(productTranslations.productId, id), eq(productTranslations.locale, locale)))
      if (translation)
        await tx
          .update(productTranslations)
          .set(copy)
          .where(eq(productTranslations.id, translation.id))
      else await tx.insert(productTranslations).values({ productId: id, locale, ...copy })
    }
    const [vial] = await tx.select().from(vials).where(eq(vials.sku, CHECKOUT_TEST_SKU))
    if (vial && vial.productId !== id) throw new Error("Test SKU belongs to another product")
    // Preserve reservations and remaining stock on every deployment.
    if (!vial)
      await tx.insert(vials).values({
        productId: id,
        sku: CHECKOUT_TEST_SKU,
        sizeValue: 1,
        sizeUnit: "vial",
        sizeMg: null,
        priceCents: 150,
        stockQty: 100,
        purchaseMode: "direct",
      })
  })
  console.log(
    `[checkout-test] Ready: /en/shop/${CHECKOUT_TEST_SLUG}; total EUR 1.50; no goods or shipment`,
  )
} finally {
  await db.$client.end()
}
