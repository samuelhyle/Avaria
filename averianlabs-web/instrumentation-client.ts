import { captureRouterTransitionStart } from "@/lib/observability/client-reporter"

/**
 * Browser instrumentation.
 *
 * The Sentry SDK is intentionally absent from this file: importing it here
 * would put ~105 KiB of gzipped JavaScript on the critical path of every
 * page. `lib/observability/client-reporter` loads it on demand instead, the
 * first time an error actually needs to be reported.
 */
export const onRouterTransitionStart = captureRouterTransitionStart
