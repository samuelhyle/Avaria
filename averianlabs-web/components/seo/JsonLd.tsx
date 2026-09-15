import type { Product } from "@/lib/products/types"
import { formatCurrency } from "@/lib/utils/format"

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

interface ProductJsonLdProps {
  product: Product
  locale: string
  url: string
}

export function ProductJsonLd({ product, locale, url }: ProductJsonLdProps) {
  const minVial = product.vials.reduce(
    (min, v) => (v.priceCents < min.priceCents ? v : min),
    product.vials[0]!,
  )
  const translation = product.translations?.[locale as "en"] ?? product.defaultTranslation
  const isContact = minVial.contactOnly === true || minVial.priceCents === 0

  const data = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: translation.name,
    description: translation.tagline,
    url,
    sku: minVial.sku,
    mpn: product.latestBatch?.code,
    category: product.category,
    brand: { "@type": "Brand", name: "AverianLabs" },
    ...(product.casNumber ? { identifier: product.casNumber } : {}),
    ...(product.purityPercent
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "HPLC Purity",
              value: `${product.purityPercent}%`,
            },
          ],
        }
      : {}),
    offers: isContact
      ? {
          "@type": "Offer",
          availability: "https://schema.org/PreOrder",
          priceCurrency: "EUR",
          price: 0,
          seller: { "@type": "Organization", name: "AverianLabs" },
        }
      : {
          "@type": "Offer",
          url,
          priceCurrency: "EUR",
          price: (minVial.priceCents / 100).toFixed(2),
          availability:
            minVial.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: "AverianLabs" },
          priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        },
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
          item: `https://averianlabs.eu${item.href}`,
        })),
      }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      id="ld-org"
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "AverianLabs",
        url: "https://averianlabs.eu",
        logo: "https://averianlabs.eu/og/logo.png",
        description: "Premium research-grade peptides for laboratory research.",
        sameAs: ["https://twitter.com/averianlabs", "https://linkedin.com/company/averianlabs"],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "hello@averianlabs.eu",
          availableLanguage: ["en", "fi", "de", "sv", "nl"],
        },
      }}
    />
  )
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      id="ld-website"
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AverianLabs",
        url: "https://averianlabs.eu",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://averianlabs.eu/{locale}/shop?q={search_term_string}",
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
          url: `https://averianlabs.eu/${locale}/glossary`,
        },
        url,
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
        url,
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
          url: `https://averianlabs.eu/${locale}`,
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
        url,
        numberOfItems: items.length,
        itemListElement: items.map((it) => ({
          "@type": "ListItem",
          position: it.position,
          name: it.name,
          url: it.url,
        })),
        isPartOf: {
          "@type": "WebSite",
          name: "AverianLabs",
          url: `https://averianlabs.eu/${locale}`,
        },
      }}
    />
  )
}
