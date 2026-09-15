/**
 * Seed categories for the forum.
 */
export interface CategorySeed {
  slug: string
  nameKey: string
  descriptionKey: string
  sortOrder: number
}

export const CATEGORY_SEEDS: readonly CategorySeed[] = [
  {
    slug: "announcements",
    nameKey: "community.categories.announcements.name",
    descriptionKey: "community.categories.announcements.description",
    sortOrder: 0,
  },
  {
    slug: "research-discussion",
    nameKey: "community.categories.researchDiscussion.name",
    descriptionKey: "community.categories.researchDiscussion.description",
    sortOrder: 1,
  },
  {
    slug: "documentation-coa",
    nameKey: "community.categories.documentationCoa.name",
    descriptionKey: "community.categories.documentationCoa.description",
    sortOrder: 2,
  },
  {
    slug: "methods-analysis",
    nameKey: "community.categories.methodsAnalysis.name",
    descriptionKey: "community.categories.methodsAnalysis.description",
    sortOrder: 3,
  },
  {
    slug: "storage-handling",
    nameKey: "community.categories.storageHandling.name",
    descriptionKey: "community.categories.storageHandling.description",
    sortOrder: 4,
  },
  {
    slug: "market-compliance",
    nameKey: "community.categories.marketCompliance.name",
    descriptionKey: "community.categories.marketCompliance.description",
    sortOrder: 5,
  },
  {
    slug: "off-topic-lounge",
    nameKey: "community.categories.offTopicLounge.name",
    descriptionKey: "community.categories.offTopicLounge.description",
    sortOrder: 6,
  },
] as const

export type CategorySlug = (typeof CATEGORY_SEEDS)[number]["slug"]
