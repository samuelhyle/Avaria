"use client"

import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import * as Sentry from "@sentry/nextjs"
import { FlaskConical, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const [fi, setFi] = useState(false)
  useEffect(() => {
    setFi(window.location.pathname.startsWith("/fi"))
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang={fi ? "fi" : "en"}>
      <body className="min-h-screen bg-bg text-ink">
        <Container className="py-24">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
              <FlaskConical className="h-7 w-7" />
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-widest text-danger">
              {fi ? "Virhe" : "Error"}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
              {fi ? "Jokin meni pieleen." : "Something went wrong."}
            </h1>
            <p className="mt-4 text-ink-muted text-pretty">
              {fi
                ? "Yritä uudelleen. Jos ongelma jatkuu, ota yhteyttä tukeen."
                : "Try again. If the problem persists, contact support."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={reset}>
                <RefreshCw className="h-4 w-4" />
                {fi ? "Yritä uudelleen" : "Try again"}
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="mailto:hello@averianlabs.eu">
                  <Mail className="h-4 w-4" />
                  {fi ? "Ota yhteyttä" : "Contact us"}
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </body>
    </html>
  )
}
