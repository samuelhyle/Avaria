import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  if (!isAuthorizedCronRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // Enable only after the corresponding consent and customer workflow is implemented.
  return NextResponse.json({ error: "review_workflow_unavailable" }, { status: 503 })
}
