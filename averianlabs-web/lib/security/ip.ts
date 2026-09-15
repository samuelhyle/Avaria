/**
 * Best-effort client IP for rate limiting.
 *
 * On Vercel, `x-forwarded-for` is set by the platform. Behind other proxies,
 * prefer a proxy-specific header and only fall back to `x-forwarded-for`.
 */
export function clientIp(request: Request): string {
  const headers = request.headers
  const direct = headers.get("cf-connecting-ip") ?? headers.get("x-vercel-forwarded-for")
  if (direct) return direct.trim()

  const forwarded = headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  if (first) return first

  return headers.get("x-real-ip")?.trim() ?? "unknown"
}
