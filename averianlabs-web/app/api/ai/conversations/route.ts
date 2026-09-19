/**
 * GET/POST /api/ai/conversations
 *
 * Lists recent conversations for the current owner (anonymous cookie or
 * authenticated user) and creates a new one. Used by the chat widget to
 * surface prior conversations in a sidebar (Phase A3 polish).
 */

import { getAnonFromRequest } from "@/lib/ai/memory/consent"
import {
  type ConversationOwner,
  getOrCreateConversation,
  listConversations,
} from "@/lib/ai/memory/store"
import { auth } from "@/lib/auth"
import { locales } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export const runtime = "nodejs"

export async function GET(request: Request): Promise<NextResponse> {
  const limit = await rateLimit(`ai:conversations:${clientIp(request)}`, {
    limit: 60,
    window: "1 m",
  })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const owner = await resolveOwner(request)
  if (!owner) return NextResponse.json({ conversations: [] })
  const conversations = await listConversations(owner, 20)
  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      locale: c.locale,
      lastMessageAt: c.lastMessageAt.toISOString(),
    })),
  })
}

export async function POST(request: Request): Promise<NextResponse> {
  const limit = await rateLimit(`ai:conversations:create:${clientIp(request)}`, {
    limit: 20,
    window: "1 m",
  })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    locale?: string
    contextKind?: string
    contextPath?: string
  }
  const owner = await resolveOwner(request)
  if (!owner) return NextResponse.json({ error: "no_owner" }, { status: 400 })
  const locale = body.locale && locales.includes(body.locale as never) ? body.locale : "en"
  const conv = await getOrCreateConversation({
    owner,
    locale,
    contextKind: body.contextKind?.slice(0, 64),
    contextPath: body.contextPath?.slice(0, 512),
    optedIn: "accepted",
  })
  return NextResponse.json({ id: conv.id })
}

async function resolveOwner(request: Request): Promise<ConversationOwner | null> {
  const session = await auth().catch(() => null)
  const userId = (session?.user as { id?: string } | null | undefined)?.id ?? null
  if (userId) return { kind: "user", userId }
  const anonId = getAnonFromRequest(request)
  if (anonId) return { kind: "anonymous", anonymousId: anonId }
  return null
}
