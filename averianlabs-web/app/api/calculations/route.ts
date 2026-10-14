import { savedCalculations } from "@/db/schema"
import { type LaboratoryInputs, calculateLaboratory } from "@/lib/calculations"
import { getCurrentMember } from "@/lib/community/auth"
import { db } from "@/lib/db"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
const schema = z
  .object({
    inputs: z
      .object({
        mode: z.enum(["concentration", "volume", "dilution", "aliquots"]),
        massMg: z.number().positive().finite().optional(),
        finalVolumeMl: z.number().positive().finite().optional(),
        aliquotMcg: z.number().positive().finite().optional(),
        stockMgPerMl: z.number().positive().finite().optional(),
        targetMgPerMl: z.number().positive().finite().optional(),
      })
      .strict(),
    sourceSku: z.string().max(80).nullable().optional(),
  })
  .strict()
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  const items = await db
    .select()
    .from(savedCalculations)
    .where(eq(savedCalculations.ownerId, member.id))
    .orderBy(desc(savedCalculations.createdAt))
    .limit(50)
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } })
}
export async function POST(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: "invalid_inputs" }, { status: 400 })
  const result = calculateLaboratory(parsed.data.inputs as LaboratoryInputs)
  if (!result) return NextResponse.json({ error: "invalid_calculation" }, { status: 422 })
  const sku = parsed.data.sourceSku
  if (sku && !(await getStorefrontCatalogue()).some((p) => p.vials.some((v) => v.sku === sku)))
    return NextResponse.json({ error: "unknown_sku" }, { status: 422 })
  const [item] = await db
    .insert(savedCalculations)
    .values({
      ownerId: member.id,
      inputs: result.inputs,
      formulaVersion: result.version,
      sourceSku: sku ?? null,
    })
    .returning()
  return NextResponse.json(
    { item },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  )
}
