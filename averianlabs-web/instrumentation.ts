import * as Sentry from "@sentry/nextjs"

export function register() {
  if (process.env.BUILD_MODE === "demo") return
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: false,
  })
}

// In the static demo build there is no request lifecycle to instrument and
// Sentry isn't initialised, so no-op instead of calling the SDK directly.
export const onRequestError =
  process.env.BUILD_MODE === "demo"
    ? () => {}
    : Sentry.captureRequestError
