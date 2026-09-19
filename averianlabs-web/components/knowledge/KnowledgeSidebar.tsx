import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { listBatchSummaries } from "@/lib/coa/lookup"
import { getStaticGlossaryByCategory } from "@/lib/knowledge"
import type { Locale } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import {
  ArrowRight,
  BookText,
  Calculator,
  FileCheck2,
  FlaskConical,
  Microscope,
  Newspaper,
  Package,
} from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

interface KnowledgeSidebarProps {
  locale: Locale
  className?: string
}

export async function KnowledgeSidebar({ locale, className }: KnowledgeSidebarProps) {
  const t = await getTranslations({ locale, namespace: "knowledge" })
  const [batches, groupedGlossary] = await Promise.all([
    Promise.resolve(listBatchSummaries().slice(0, 5)),
    Promise.resolve(getStaticGlossaryByCategory()),
  ])

  const glossaryPreview = Object.entries(groupedGlossary)
    .flatMap(([, terms]) => terms)
    .slice(0, 6)

  return (
    <aside className={cn("space-y-5", className)}>
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <FlaskConical className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-ink">{t("quickAccess")}</h3>
        </div>
        <ul className="space-y-1.5 text-xs">
          <li>
            <Link
              href={`/${locale}/coa`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <FileCheck2 className="h-3.5 w-3.5" /> {t("links.coa")}
              </span>
              <Badge tone="muted" size="sm">
                {batches.length}
              </Badge>
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/lab-tests`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <Microscope className="h-3.5 w-3.5" /> {t("links.methods")}
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/blog`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <Newspaper className="h-3.5 w-3.5" /> {t("links.articles")}
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/glossary`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <BookText className="h-3.5 w-3.5" /> {t("links.glossary")}
              </span>
              <Badge tone="muted" size="sm">
                {Object.values(groupedGlossary).flat().length}
              </Badge>
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/peptide-calculator`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <Calculator className="h-3.5 w-3.5" /> {t("links.calculators")}
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/shop`}
              className="flex items-center justify-between rounded-[var(--radius)] px-2 py-1.5 text-ink-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
            >
              <span className="inline-flex items-center gap-2">
                <Package className="h-3.5 w-3.5" /> {t("links.products")}
              </span>
            </Link>
          </li>
        </ul>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{t("recentGlossary")}</h3>
          <Link
            href={`/${locale}/glossary`}
            className="inline-flex items-center gap-0.5 text-2xs text-accent hover:text-accent-ink"
          >
            {t("viewAll")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="space-y-2 text-xs">
          {glossaryPreview.map((term) => {
            const tr = term.translations[locale]
            return (
              <li key={term.slug}>
                <Link
                  href={`/${locale}/glossary/${term.slug}`}
                  className="block rounded-[var(--radius)] border border-line/60 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
                >
                  <div className="font-medium text-ink">{tr.term}</div>
                  <p className="line-clamp-1 text-2xs text-ink-muted">{tr.short}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </aside>
  )
}
