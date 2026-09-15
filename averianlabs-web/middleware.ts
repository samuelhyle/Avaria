import { type NextRequest, NextResponse } from "next/server"
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

  const response = NextResponse.next()
  response.headers.set("x-locale", first)
  return response
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
