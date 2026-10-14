import { Button } from "@/components/ui/Button"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
export async function BrandBlock({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const r = await getTranslations({ locale, namespace: "research" })
  return (
    <div className="min-w-0 max-w-xl">
      <p className="mb-4 text-xs font-medium uppercase tracking-[.16em] text-accent">
        {t("heroEyebrow")}
      </p>
      <h1 className="break-words hyphens-auto font-display text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.25rem]">
        {t("heroTitle")}
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">{t("heroSubtitle")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/${locale}/shop`}>{t("ctaShop")} →</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${locale}/coa`}>{t("ctaResearch")}</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-ink-muted">{r("researchOnly")}</p>
    </div>
  )
}
