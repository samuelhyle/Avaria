import { abandonedCartHtml, sendEmail } from "@/lib/email"
import { locales } from "@/lib/i18n/config"
import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { getTranslations } from "next-intl/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(locales).default("en"),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        mg: z.number().int().nonnegative().max(100_000),
        priceCents: z.number().int().nonnegative().max(100_000_000),
      }),
    )
    .min(1)
    .max(50),
})

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { email, locale, items } = parsed.data

  const html = await abandonedCartHtml({ customerEmail: email, items, locale })
  const t = await getTranslations({ locale, namespace: "email" })

  const ok = await sendEmail({
    to: email,
    subject: t("cartRecoverySubject"),
    html,
  })

  return NextResponse.json({ sent: ok })
}
