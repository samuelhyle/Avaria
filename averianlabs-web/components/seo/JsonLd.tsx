import { getLegalIdentity } from "@/lib/legal"
import type { Product } from "@/lib/products/types"
import { siteOrigin } from "@/lib/seo/site-origin"

interface JsonLdProps {
  data: Record<string, unknown>
  id?: string
}

/** Escapes `<` so user-controlled strings cannot break out of the script tag. */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c")
}

export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

/** These schema properties describe this site's routes, including legacy absolute callers. */
function internalSchemaUrl(href: string): string {
  const url = new URL(href, siteOrigin())
  return `${siteOrigin()}${url.pathname}${url.search}${url.hash}`
}

interface ProductJsonLdProps {
  product: Product
  locale: string
  url: string
}

export function ProductJsonLd({ product, locale, url }: ProductJsonLdProps) {
  const translation = product.translations?.[locale as "en"] ?? product.defaultTranslation
  const direct = product.vials.filter((v) => v.purchaseMode === "direct" && v.priceCents > 0)
  const data = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: translation.name,
    description: translation.description,
    url,
    category: product.category,
    ...(product.casNumber && product.specificationsVerified
      ? { identifier: product.casNumber }
      : {}),
    ...(direct.length
      ? {
          offers: direct.map((v) => ({
            "@type": "Offer",
            sku: v.sku,
            url,
            priceCurrency: "EUR",
            price: (v.priceCents / 100).toFixed(2),
            availability:
              v.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: getLegalIdentity().companyName },
          })),
        }
      : {}),
  }

  return <JsonLd data={data} id="ld-product" />
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; href: string }> }) {
  return (
    <JsonLd
      id="ld-breadcrumb"
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: internalSchemaUrl(item.href),
        })),
      }}
    />
  )
}

export function OrganizationJsonLd() {
  const identity = getLegalIdentity()
  return (
    <JsonLd
      id="ld-org"
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: identity.companyName,
        url: siteOrigin(),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: identity.contactEmail,
          availableLanguage: ["en", "fi"],
        },
      }}
    />
  )
}

export function WebsiteJsonLd({ locale = "en" }: { locale?: string } = {}) {
  return (
    <JsonLd
      id="ld-website"
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AverianLabs",
        url: siteOrigin(),
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteOrigin()}/${locale}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  )
}

export function GlossaryTermJsonLd({
  term,
  shortDefinition,
  url,
  locale,
}: {
  term: string
  shortDefinition: string
  url: string
  locale: string
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: term,
        description: shortDefinition,
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          name: "AverianLabs Glossary",
          url: `${siteOrigin()}/${locale}/glossary`,
        },
        url: internalSchemaUrl(url),
      }}
    />
  )
}

export function DiscussionForumPostingJsonLd({
  title,
  url,
  datePublished,
  authorName,
  commentCount,
  locale,
}: {
  title: string
  url: string
  datePublished: string
  authorName: string
  commentCount: number
  locale: string
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        headline: title,
        url: internalSchemaUrl(url),
        datePublished,
        author: { "@type": "Person", name: authorName },
        interactionStatistic: {
          "@type": "InteractionCounter",
          interactionType: { "@type": "ReplyAction" },
          userInteractionCount: commentCount,
        },
        isPartOf: {
          "@type": "WebSite",
          name: "AverianLabs",
          url: `${siteOrigin()}/${locale}`,
        },
      }}
    />
  )
}

export function ItemListJsonLd({
  name,
  url,
  items,
  locale,
}: {
  name: string
  url: string
  items: { name: string; url: string; position: number }[]
  locale: string
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        url: internalSchemaUrl(url),
        numberOfItems: items.length,
        itemListElement: items.map((it) => ({
          "@type": "ListItem",
          position: it.position,
          name: it.name,
          url: internalSchemaUrl(it.url),
        })),
        isPartOf: {
          "@type": "WebSite",
          name: "AverianLabs",
          url: `${siteOrigin()}/${locale}`,
        },
      }}
    />
  )
}
