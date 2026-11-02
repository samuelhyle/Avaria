import { getLegalIdentity } from "@/lib/legal"
import { getTranslations } from "next-intl/server"

export interface FooterContent {
  locale: string
  cols: Array<{ title: string; links: Array<{ href: string; label: string }> }>
  tagline: string
  testResultsLabel: string
  paymentsLabel: string | null
  researchUse: string
  rightsReserved: string
  businessIdentity: string | null
  legalPending: string
  contactEmail: string
  address: string
}

/** Resolve all request-specific footer data before the composition shell renders. */
export async function getFooterContent(locale: string): Promise<FooterContent> {
  const [t, r, e] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "research" }),
    getTranslations({ locale, namespace: "experience" }),
  ])
  const legal = getLegalIdentity()
  return {
    locale,
    cols: [
      {
        title: t("research"),
        links: [
          { href: `/${locale}/shop`, label: t("shop") },
          { href: `/${locale}/certificates`, label: e("certificates") },
          { href: `/${locale}/documents`, label: e("documents") },
          { href: `/${locale}/research-tools`, label: r("tools") },
          { href: `/${locale}/community`, label: t("community") },
        ],
      },
      {
        title: t("company"),
        links: [
          { href: `/${locale}/about`, label: t("about") },
          { href: `/${locale}/quality`, label: t("quality") },
          { href: `/${locale}/partner`, label: t("partner") },
        ],
      },
      {
        title: t("support"),
        links: [
          { href: `/${locale}/faq`, label: t("faq") },
          { href: `/${locale}/support/shipping-returns`, label: t("shipping") },
          { href: `/${locale}/contact`, label: t("contact") },
          { href: `/${locale}/account`, label: t("account") },
        ],
      },
      {
        title: t("legal"),
        links: [
          { href: `/${locale}/legal/terms`, label: t("terms") },
          { href: `/${locale}/legal/privacy`, label: t("privacy") },
          { href: `/${locale}/legal/cookies`, label: t("cookies") },
          { href: `/${locale}/legal/research-disclaimer`, label: t("disclaimer") },
        ],
      },
    ],
    tagline: t("tagline"),
    testResultsLabel: t("verifiedBy"),
    // Only the existing display condition crosses the server/client boundary.
    paymentsLabel: process.env.STRIPE_SECRET_KEY ? `${t("paymentsTitle")} · ${r("card")}` : null,
    researchUse: t("researchUse"),
    rightsReserved: t("rightsReserved", { year: new Date().getFullYear() }),
    businessIdentity:
      legal.businessId && legal.vatId
        ? `${r("businessId")} ${legal.businessId} · VAT ${legal.vatId}`
        : null,
    legalPending: r("legalPending"),
    contactEmail: legal.contactEmail,
    address: [legal.addressLine1, legal.addressLine2].filter(Boolean).join(", "),
  }
}
