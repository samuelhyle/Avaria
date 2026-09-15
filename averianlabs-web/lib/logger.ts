type Level = "debug" | "info" | "warn" | "error"

function normalizeArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return { name: arg.name, message: arg.message, stack: arg.stack }
  }
  return arg
}

function emit(level: Level, message: string, args: unknown[]): void {
  const normalized = args.map(normalizeArg)
  const context =
    normalized.length === 0 ? undefined : normalized.length === 1 ? normalized[0] : normalized
  const isPlainObject = typeof context === "object" && context !== null && !Array.isArray(context)

  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(isPlainObject ? (context as Record<string, unknown>) : {}),
    ...(!isPlainObject && context !== undefined ? { context } : {}),
  })

  if (level === "error") console.error(entry)
  else if (level === "warn") console.warn(entry)
  else console.log(entry)
}

/**
 * Minimal structured logger. Emits one JSON object per line so log drains can
 * index fields instead of parsing prose. Drop-in replacement for `console.*`
 * (accepts any number of extra args; Errors are expanded with stacks).
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => emit("debug", message, args),
  info: (message: string, ...args: unknown[]) => emit("info", message, args),
  warn: (message: string, ...args: unknown[]) => emit("warn", message, args),
  error: (message: string, ...args: unknown[]) => emit("error", message, args),
}
