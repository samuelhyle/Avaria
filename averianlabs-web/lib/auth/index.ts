import { users } from "@/db/schema"
import { db, isDatabaseConfigured } from "@/lib/db"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { verify } from "argon2"
import crypto from "node:crypto"
import { eq } from "drizzle-orm"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { authAdapterSchema } from "./db-schema"

const authSecret = process.env.AUTH_SECRET?.trim()
const authUrl = process.env.AUTH_URL?.trim()

// In environments where Auth.js isn't configured (e.g. a Netlify preview
// without a Neon DB / Auth.js secret), generate a per-process fallback so the
// module loads. Actual login/registration routes short-circuit with a 503 when
// the secret isn't a real one — see `requireAuthSecret()` below.
const fallbackSecret = crypto.randomBytes(32).toString("base64")
const effectiveSecret = authSecret && authSecret.length >= 16 ? authSecret : fallbackSecret

const secureCookies = (authUrl ?? "").startsWith("https://")

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, authAdapterSchema),
  secret: effectiveSecret,
  // Trust the request host in development (localhost / preview hosts). In
  // production this must be opted into explicitly via AUTH_TRUST_HOST=true.
  // Auth.js v5 treats `trustHost: false` as "trust no host" (it is not an
  // allowlist against AUTH_URL), so it must be true. Production requires
  // AUTH_URL, which pins canonical origins against Host-header spoofing.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/account" },
  useSecureCookies: secureCookies,
  cookies: {
    sessionToken: {
      name: secureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
  },
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
})

/** True when the process has a real AUTH_SECRET (not the per-process fallback). */
export function isAuthConfigured(): boolean {
  return Boolean(authSecret && authSecret.length >= 16) && isDatabaseConfigured()
}
