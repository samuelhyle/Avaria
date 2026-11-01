"use client"

import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { reportClientError } from "@/lib/observability/client-reporter"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect } from "react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const r = useTranslations("research")
  const locale = useLocale()
  useEffect(() => {
    reportClientError(error)
  }, [error])

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-danger">{r("error")}</p>
        <h1 className="mt-3 h-page">{r("errorTitle")}</h1>
        <p className="mt-4 text-ink-muted text-pretty">{r("errorBody")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            {r("retry")}
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}`}>
              <ArrowLeft className="h-4 w-4" />
              {r("home")}
            </Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}
