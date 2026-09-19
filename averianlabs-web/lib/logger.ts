/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line so log drains (Loki, Datadog, Vercel logs)
 * can index fields instead of parsing prose. Drop-in replacement for
 * `console.*` — accepts any number of extra args; Errors are expanded with
 * stacks.
 *
 * Per-request correlation: `withRequestId()` returns a child logger that
 * stamps every line with the same `requestId` field. Next.js request
 * handlers can wire it up via `getRequestContext()` (in `lib/observability/
 * request-context.ts`) — the chat route and webhook handlers adopt it
 * as the simplest cross-cutting upgrade to make log triage actually
 * possible during an incident.
 */

type Level = "debug" | "info" | "warn" | "error"

function normalizeArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return { name: arg.name, message: arg.message, stack: arg.stack }
  }
  return arg
}

interface LoggerBindings {
  [key: string]: unknown
}

function emit(level: Level, message: string, args: unknown[], bindings: LoggerBindings): void {
  const normalized = args.map(normalizeArg)
  const context =
    normalized.length === 0 ? undefined : normalized.length === 1 ? normalized[0] : normalized
  const isPlainObject = typeof context === "object" && context !== null && !Array.isArray(context)

  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...bindings,
    ...(isPlainObject ? (context as Record<string, unknown>) : {}),
    ...(!isPlainObject && context !== undefined ? { context } : {}),
  })

  if (level === "error") console.error(entry)
  else if (level === "warn") console.warn(entry)
  else console.log(entry)
}

function makeLogger(bindings: LoggerBindings) {
  return {
    debug: (message: string, ...args: unknown[]) => emit("debug", message, args, bindings),
    info: (message: string, ...args: unknown[]) => emit("info", message, args, bindings),
    warn: (message: string, ...args: unknown[]) => emit("warn", message, args, bindings),
    error: (message: string, ...args: unknown[]) => emit("error", message, args, bindings),
    child: (more: LoggerBindings) => makeLogger({ ...bindings, ...more }),
  }
}

/** Root logger — no bindings. Useful for app-startup / cron logs. */
export const logger = makeLogger({})

/**
 * Bind a request-scoped context (request id, ip, locale) to every line a
 * handler emits. The child logger composes, so `withRequestId(...).child(
 * { orderId })` produces a logger that emits both fields on every line.
 *
 * Intentionally a plain factory — we don't introduce AsyncLocalStorage
 * because the route handlers we have today are short-lived and a per-call
 * `logger` is cheaper than context propagation.
 */
export function withRequestId(bindings: LoggerBindings) {
  return makeLogger(bindings)
}
