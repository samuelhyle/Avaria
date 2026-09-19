import crypto from "node:crypto"
import { users } from "@/db/schema"
import { db, isDatabaseConfigured } from "@/lib/db"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { authAdapterSchema } from "./db-schema"

// AUTH_SECRET must be set via environment — no fallback.
// If unset, isAuthConfigured() will return false and auth routes will 503.
const authSecret = process.env.AUTH_SECRET?.trim()

// AUTH_URL must be set in production to pin canonical origins against Host-header spoofing.
// In development, it defaults to the local request origin.
const authUrl = process.env.AUTH_URL?.trim()

const isProduction = process.env.NODE_ENV === "production"

// Secure cookies in any production deployment — falling back to `authUrl`
// alone lets a misconfigured AUTH_URL (e.g. `http://prod-host`) silently
// downgrade session cookies to plaintext. Force the Secure flag when
// running in production, regardless of the configured scheme.
const secureCookies = isProduction || Boolean(authUrl?.startsWith("https://"))

// `trustHost: true` lets Auth.js v5 honor the incoming `Host` header when
// computing canonical redirect URLs. Without AUTH_URL in production, that
// becomes a Host-header injection vector — an attacker can craft a request
// with a Host pointing at an attacker-controlled origin and Auth.js will
// happily redirect the post-login callback there. Gate it so production
// REQUIRES AUTH_URL to be set, and the dev experience still works on
// `localhost`/preview hosts.
const trustHost = !isProduction || Boolean(authUrl?.startsWith("https://"))

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(creds, request) {
      if (!isAuthConfigured()) return null
      const email = typeof creds?.email === "string" ? creds.email.trim().toLowerCase() : ""
      const password = typeof creds?.password === "string" ? creds.password : ""
      if (!email || !password) return null

      // Coarse IP guard before the expensive hash. Successful logins are never
      // blocked by per-email failure counters (no denial-of-service lockout).
      const ip = clientIp(request)
      const ipLimit = await rateLimit(`login:ip:${ip}`, { limit: 30, window: "10 m" })
      if (!ipLimit.success) return null

      const user = await db.query.users.findFirst({ where: eq(users.email, email) })
      if (!user?.passwordHash || user.deletedAt) return null

      // argon2 ships a native binding — loaded lazily so server routes that
      // touch `@/lib/auth` (community hub, account pages, …) don't have to
      // bundle the whole native module just to read a session cookie.
      const { verify } = await import("argon2")
      const valid = await verify(user.passwordHash, password)
      if (!valid) {
        await rateLimit(`login:fail:${email}`, { limit: 10, window: "15 m" })
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  )
}

// secret: omit when not configured so NextAuth generates a per-process fallback
// only for development previews; production must set AUTH_SECRET.
const authConfig = {
  // adapter: DrizzleAdapter(db, authAdapterSchema),
  // secret: authSecret, // set conditionally below
  // Trust the request host ONLY when:
  //   - we're in development (localhost / preview hosts), OR
  //   - AUTH_URL is set to an HTTPS URL (the canonical origin is pinned, so
  //     a spoofed Host header cannot redirect callbacks elsewhere).
  // In production with no AUTH_URL, `trustHost: false` is the safer default
  // — Auth.js v5 will refuse to redirect rather than honor an attacker
  // controlled Host. Re-enable with the env-var path documented above.
  trustHost,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/account" },
  useSecureCookies: secureCookies,
  cookies: {
    sessionToken: {
      name: secureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
  },
  // Only add adapter/secret when DB + secret are configured.
  ...(isAuthConfigured()
    ? {
        adapter: DrizzleAdapter(db, authAdapterSchema),
        secret: authSecret,
      }
    : {}),
  providers,
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch {
        // fall through to baseUrl
      }
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user && "id" in user && user.id) token.sub = user.id
      // Hydrate the role once per issued token; it is cached in the JWT after.
      if (token.sub && !token.role) {
        try {
          const row = await db.query.users.findFirst({
            where: eq(users.id, token.sub),
            columns: { role: true },
          })
          if (row?.role) token.role = row.role
        } catch {
          // Keep the session usable if the role lookup fails.
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        ;(session.user as { role?: string }).role = (token.role as string | undefined) ?? "customer"
      }
      return session
    },
  },
} as NextAuthConfig

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

/** True when the process has a real AUTH_SECRET (not the per-process fallback). */
export function isAuthConfigured(): boolean {
  return Boolean(authSecret && authSecret.length >= 16) && isDatabaseConfigured()
}

/**
 * Test-only: true when the auth config will issue Secure, __Secure-prefixed
 * cookies. Exposed for the auth integration tests so we can assert the
 * post-fix hardening actually engages in production-shaped envs.
 */
export function __isSecureCookieMode(): boolean {
  return secureCookies
}
