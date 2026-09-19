import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/utils/cn"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

interface KnowledgeCardProps {
  href: string
  icon: LucideIcon
  titleKey: "coa" | "methods" | "products" | "articles" | "glossary" | "calculators"
  descriptionKey: "coa" | "methods" | "products" | "articles" | "glossary" | "calculators"
  count: number
  locale: string
  iconHue?: number
  className?: string
}

const HUE_MAP: Record<string, string> = {
  coa: "from-ice to-accent",
  methods: "from-accent to-ice",
  products: "from-success to-accent",
  articles: "from-warn to-accent",
  glossary: "from-accent to-ice",
  calculators: "from-accent to-ice",
}

export async function KnowledgeCard({
  href,
  icon: Icon,
  titleKey,
  descriptionKey,
  count,
  locale,
  iconHue,
  className,
}: KnowledgeCardProps) {
  const t = await getTranslations({ locale, namespace: "knowledge.categories" })

  return (
    <Card className={cn("group relative overflow-hidden p-5", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.07] transition-opacity duration-300 group-hover:opacity-15",
          HUE_MAP[titleKey] ?? "from-accent to-ice",
        )}
        style={iconHue !== undefined ? { background: `hsl(${iconHue} 80% 92%)` } : undefined}
      />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink">
              {t(`${titleKey}.title`)}
            </h3>
            <Badge tone="muted" size="sm">
              {t("itemsCount", { count })}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{t(`${descriptionKey}.desc`)}</p>
          <Link
            href={`/${locale}${href}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-ink"
          >
            {t("browseAll")}
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </Card>
  )
}
