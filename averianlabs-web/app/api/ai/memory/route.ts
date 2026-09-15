/**
 * GET/PUT/DELETE /api/ai/memory
 *
 * Lists, upserts, or deletes user_memories rows for the current owner.
 * Keyed by (userId or anonymousId, key). The system prompt injects these
 * on every turn, so writes are size- and count-bounded.
 */

import { getAnonFromRequest } from "@/lib/ai/memory/consent"
import { deleteAllMemories, deleteMemory, listMemories, upsertMemory } from "@/lib/ai/memory/store"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const MAX_VALUE_BYTES = 2048
const MAX_MEMORIES_PER_OWNER = 50

// Must match the regex in lib/ai/tools/remember.ts so direct HTTP writes
// can never bypass the tool-layer's key validation.
const MEMORY_KEY_RE = /^[a-z0-9_-]{2,64}$/i

const valueSchema = z.unknown().refine(
  (value) => {
    try {
      return JSON.stringify(value ?? null).length <= MAX_VALUE_BYTES
    } catch {
      return false
    }
  },
  { message: `Memory value must serialize to <= ${MAX_VALUE_BYTES} bytes` },
)

const putSchema = z.object({
  key: z.string().min(2).max(64).regex(MEMORY_KEY_RE, "key must match /^[a-z0-9_-]{2,64}$/i"),
  value: valueSchema,
  source: z.enum(["explicit", "inferred"]).optional(),
})

const deleteSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(MEMORY_KEY_RE, "key must match /^[a-z0-9_-]{2,64}$/i")
    .optional(),
})

async function resolveUserId(request: Request): Promise<string | null> {
  const session = await auth().catch(() => null)
  const userId = (session?.user as { id?: string } | null | undefined)?.id ?? null
  if (userId) return userId
  return getAnonFromRequest(request)
}

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ memories: [] })
  const memories = await listMemories(userId)
  return NextResponse.json({
    memories: memories.map((m) => ({
      id: m.id,
      key: m.key,
      value: m.value,
      source: m.source,
      updatedAt: m.updatedAt.toISOString(),
    })),
  })
}

export async function PUT(request: Request): Promise<NextResponse> {
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: "no_owner" }, { status: 400 })

  const limit = await rateLimit(`ai:memory:${userId}`, { limit: 30, window: "1 m" })
  if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 })

  let body: z.infer<typeof putSchema>
  try {
    body = putSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const existing = await listMemories(userId)
  const isNew = !existing.some((m) => m.key === body.key)
  if (isNew && existing.length >= MAX_MEMORIES_PER_OWNER) {
    return NextResponse.json({ error: "memory_limit_reached" }, { status: 409 })
  }

  const row = await upsertMemory({
    userId,
    key: body.key,
    value: body.value,
    source: body.source,
  })
  return NextResponse.json({ ok: true, id: row.id })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: "no_owner" }, { status: 400 })

  const limit = await rateLimit(`ai:memory-delete:${userId}`, { limit: 30, window: "1 m" })
  if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 })

  let body: z.infer<typeof deleteSchema>
  try {
    body = deleteSchema.parse(await request.json().catch(() => ({})))
  } catch {
    body = {}
  }
  if (body.key) {
    await deleteMemory(userId, body.key)
  } else {
    await deleteAllMemories(userId)
  }
  return NextResponse.json({ ok: true })
}
