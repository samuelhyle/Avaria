/**
 * The error copy the assistant shows.
 *
 * The keys are handed to a translator that is injected by the caller, so a
 * static analysis of the call sites cannot see which keys are read. They are
 * published in a map instead, and `scripts/i18n-client-slice.mjs` reads the
 * map so the keys stay in the browser's message slice.
 */
export const CHAT_ERROR_MESSAGE_KEYS = {
  averia: [
    "errorRateLimitTitle",
    "errorOfflineTitle",
    "errorInvalidTitle",
    "errorTitle",
    "errorRateLimitBody",
    "errorOfflineBody",
    "errorInvalidBody",
    "errorServerBody",
    "errorBody",
  ],
} as const

type ErrorCopy = (
  key:
    | "errorRateLimitTitle"
    | "errorOfflineTitle"
    | "errorInvalidTitle"
    | "errorTitle"
    | "errorRateLimitBody"
    | "errorOfflineBody"
    | "errorInvalidBody"
    | "errorServerBody"
    | "errorBody",
) => string

export function chatErrorTitle(t: ErrorCopy, error: Error) {
  return t(
    error.name === "rate_limited"
      ? "errorRateLimitTitle"
      : error.name === "provider_unavailable"
        ? "errorOfflineTitle"
        : error.name === "invalid_request"
          ? "errorInvalidTitle"
          : "errorTitle",
  )
}
export function chatErrorBody(t: ErrorCopy, error: Error) {
  return t(
    error.name === "rate_limited"
      ? "errorRateLimitBody"
      : error.name === "provider_unavailable"
        ? "errorOfflineBody"
        : error.name === "invalid_request"
          ? "errorInvalidBody"
          : error.name === "server_error"
            ? "errorServerBody"
            : "errorBody",
  )
}
