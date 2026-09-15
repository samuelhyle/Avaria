import { users } from "@/db/schema"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { verify } from "argon2"
import { eq } from "drizzle-orm"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { authAdapterSchema } from "./db-schema"

const env = getServerEnv()

const secureCookies = (env.AUTH_URL ?? "").startsWith("https://")

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(creds, request) {
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

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, authAdapterSchema),
  secret: env.AUTH_SECRET,
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
