import { ensureCategories, listCategories } from "@/lib/community"
import { isDatabaseConfigured } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  // Categories are a constant set — when DB isn't configured the hardcoded
  // fallback in `community/categories.ts` is the only source of truth, so
  // we return it directly without touching the DB.
  if (!isDatabaseConfigured()) {
    const { CATEGORY_SEEDS } = await import("@/lib/community/categories")
    return NextResponse.json({
      categories: CATEGORY_SEEDS.map((c) => ({
        slug: c.slug,
        nameKey: c.nameKey,
        descriptionKey: c.descriptionKey,
        sortOrder: c.sortOrder,
        isLocked: false,
      })),
    })
  }
  try {
    await ensureCategories()
    const categories = await listCategories()
    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 })
  }
}
