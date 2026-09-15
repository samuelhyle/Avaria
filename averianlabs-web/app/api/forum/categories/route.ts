import { ensureCategories, listCategories } from "@/lib/community"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await ensureCategories()
    const categories = await listCategories()
    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 })
  }
}
