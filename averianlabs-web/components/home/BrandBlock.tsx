import { BrandMark } from "@/components/home/BrandMark"
import { TrustStrip } from "@/components/home/TrustStrip"
import { TrustedBy } from "@/components/home/TrustedBy"
import { Button } from "@/components/ui/Button"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Server-rendered brand block that lives on the left of the homepage hero.
 * Contains the monogram + wordmark, eyebrow, headline, subhead, two CTAs,
 * the three-line trust strip, and the institutional "trusted by" row.
 * No JS, no animation. The matching `Hero3D` on the right is lazy-loaded.
 */
export async function BrandBlock({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })

  return (
    <div className="relative z-10 flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BrandMark locale={locale} />
        <p className="font-mono text-3xs uppercase tracking-[0.2em] text-accent-ink">
          {t("heroEyebrow")}
        </p>
      </div>

      <h1 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl lg:text-7xl">
        {t("heroTitle")}
      </h1>

      <p className="max-w-xl text-base text-ink-muted text-pretty sm:text-lg">
        {t("heroSubtitle")}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`/${locale}/shop`}>
            {t("ctaShop")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/${locale}/coa`} className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("ctaResearch")}
          </Link>
        </Button>
      </div>

      <TrustedBy />
      <TrustStrip />
    </div>
  )
}
