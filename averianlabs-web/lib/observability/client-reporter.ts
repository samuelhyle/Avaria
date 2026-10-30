"use client"

/**
 * Lazy client-side error reporting.
 *
 * `@sentry/nextjs` is ~105 KiB gzipped. Importing it statically from
 * `instrumentation-client.ts` put the whole SDK in the critical-path bundle of
 * every page — the largest single cost in the storefront's first load, paid by
 * visitors who never see an error.
 *
 * The SDK is therefore loaded on demand: the first uncaught error pulls it in
 * as a separate async chunk, and the error is queued until `init()` has run so
 * nothing is lost in the gap.
 *
 * Session Replay is off unless it is explicitly enabled. Replay records DOM
 * mutations on every page, which costs main-thread time on a phone and
 * captures text that a customer entered into the checkout form.
 */

type SentryModule = typeof import("@sentry/nextjs")

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const enabled = Boolean(dsn) && process.env.BUILD_MODE !== "demo"

/**
 * Session Replay has to be requested explicitly. It records the DOM of the
 * checkout, so it stays off in production unless somebody turns it on.
 */
const replaysEnabled = process.env.NEXT_PUBLIC_SENTRY_REPLAYS === "true"

let sdk: SentryModule | null = null
let loading: Promise<SentryModule | null> | null = null
const pending: unknown[] = []

function loadSdk(): Promise<SentryModule | null> {
  if (!enabled) return Promise.resolve(null)
  if (sdk) return Promise.resolve(sdk)
  if (!loading) {
    loading = import("@sentry/nextjs")
      .then((mod) => {
        sdk = mod
        mod.init({
          dsn,
          environment: process.env.NODE_ENV,
          tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
          debug: false,
          replaysSessionSampleRate: replaysEnabled ? 0.1 : 0,
          replaysOnErrorSampleRate: replaysEnabled ? 1.0 : 0,
        })
        for (const error of pending.splice(0)) mod.captureException(error)
        return mod
      })
      .catch(() => null)
  }
  return loading
}

/**
 * Report an exception. The SDK is fetched the first time this is called, so
 * the very first error costs an extra round trip — after that the module is
 * cached for the life of the page.
 */
export function reportClientError(error: unknown): void {
  if (!enabled) return
  if (sdk) {
    sdk.captureException(error)
    return
  }
  pending.push(error)
  void loadSdk()
}

/**
 * Router transition spans are only useful with tracing enabled. Without the
 * SDK loaded there is nothing to record, so this is a no-op until the first
 * error pulls the module in.
 */
export function captureRouterTransitionStart(href?: string, navigationType?: string): void {
  if (!enabled) return
  void loadSdk().then((mod) => {
    if (!mod || !href || !navigationType) return
    mod.captureRouterTransitionStart(href, navigationType)
  })
}
