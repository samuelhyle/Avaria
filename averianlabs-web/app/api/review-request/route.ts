import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // Enable only after the corresponding consent and customer workflow is implemented.
  return NextResponse.json({ error: "review_workflow_unavailable" }, { status: 503 })
}
