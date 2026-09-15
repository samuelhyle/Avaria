import { getCurrentMember } from "@/lib/community"
import {
  countUnreadNotifications,
  listUnreadNotifications,
  markNotificationsRead,
} from "@/lib/notifications"
import { NextResponse } from "next/server"

export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  try {
    const [items, unread] = await Promise.all([
      listUnreadNotifications(member.id, 50),
      countUnreadNotifications(member.id),
    ])
    return NextResponse.json({ notifications: items, unread })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // empty body is OK — means "mark all as read"
  }
  const ids =
    typeof body === "object" &&
    body !== null &&
    "ids" in body &&
    Array.isArray((body as { ids: unknown }).ids)
      ? ((body as { ids: string[] }).ids ?? [])
      : undefined
  try {
    await markNotificationsRead(member.id, ids)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
