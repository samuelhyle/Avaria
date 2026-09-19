import {
  Beaker,
  Brain,
  Droplets,
  Layers,
  type LucideIcon,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react"
import type { ProductCategory } from "./types"

/**
 * Single source of truth for catalog categories — slug, i18n key, hue and
 * icon. Every surface (mega menu, mobile menu, home grid, shop filters) reads
 * from here so they can never drift again.
 */
export interface CategoryMeta {
  slug: ProductCategory
  /** i18n key suffix under the `home` namespace: catMetabolic → `cat${Key}`. */
  key: string
  hue: number
  icon: LucideIcon
}

export const CATEGORIES: CategoryMeta[] = [
  { slug: "metabolic", key: "metabolic", hue: 220, icon: Beaker },
  { slug: "recovery", key: "recovery", hue: 214, icon: Shield },
  { slug: "cognitive", key: "cognitive", hue: 250, icon: Brain },
  { slug: "longevity", key: "longevity", hue: 260, icon: Sparkles },
  { slug: "cosmetic", key: "cosmetic", hue: 340, icon: Sun },
  { slug: "blend", key: "blends", hue: 280, icon: Layers },
  { slug: "supplies", key: "supplies", hue: 198, icon: Droplets },
]

const CATEGORY_BY_SLUG = new Map<string, CategoryMeta>(
  CATEGORIES.map((category) => [category.slug, category]),
)

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORY_BY_SLUG.get(slug)
}
