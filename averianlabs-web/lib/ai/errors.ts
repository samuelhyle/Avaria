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
