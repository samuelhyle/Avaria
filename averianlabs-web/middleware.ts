import { type NextRequest, NextResponse } from "next/server"
import { isCacheableRoute } from "./lib/cache/cacheable-routes"
import { defaultLocale, isLocale } from "./lib/i18n/config"

const PUBLIC_FILE = /\.(.*)$/

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/apple-icon" ||
    pathname === "/icon" ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const segments = pathname.split("/").filter(Boolean)
  const first = segments[0]

  if (!first || !isLocale(first)) {
    const locale = detectLocale(request) ?? defaultLocale
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(url)
  }

  // The layout needs the matched path to decide which translation
  // namespaces belong in the browser payload. Middleware is the only place
  // that sees the raw path for every request, so it is forwarded as a
  // request header.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)
  requestHeaders.set("x-locale", first)

  const route = segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/"

  // A signed-in visitor gets a personal page on some routes, and the
  // account area always does. Nothing in this branch is cached for them, so
  // the cache never mixes one visitor's response with another's.
  const signedIn =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")

  const cacheable = request.method === "GET" && !signedIn && isCacheableRoute(route)

  // The cache header itself is set in `next.config.ts`: Next.js replaces the
  // `Cache-Control` a middleware sets with the one the render produced. This
  // header is what the config matches on.
  if (cacheable) requestHeaders.set("x-averianlabs-cacheable", "1")

  return NextResponse.next({ request: { headers: requestHeaders } })
}

function detectLocale(request: NextRequest): string | null {
  const accept = request.headers.get("accept-language")
  if (!accept) return null
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? ""
    const base = tag.split("-")[0]
    if (base && isLocale(base)) return base
  }
  return null
}

export const config = {
  matcher: ["/((?!_next|api|studio|_vercel|.*\\..*).*)"],
}
