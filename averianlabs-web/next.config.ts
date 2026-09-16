import { withSentryConfig } from "@sentry/nextjs/config"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts")

const isDemoBuild = process.env.BUILD_MODE === "demo"

// Next.js dev mode (webpack HMR + source maps) requires `unsafe-eval`.
// Never allow it in production.
const isDev = process.env.NODE_ENV === "development"
// NOTE: `'unsafe-inline'` is required for script-src because the storefront is
// statically generated/ISR — Next.js only stamps nonces onto inline scripts for
// dynamically rendered pages. A nonce-based CSP is tracked post-launch
// (see LAUNCH_HARDENING_PLAN.md §4 Phase 2 status).
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://js.stripe.com",
  "https://*.coinbase.com",
  "https://eu.i.posthog.com",
  "https://eu-assets.i.posthog.com",
  "https://va.vercel-scripts.com",
].join(" ")

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io https://*.r2.cloudflarestorage.com https://images.unsplash.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.sanity.io",
    "https://eu.i.posthog.com",
    "https://eu-assets.i.posthog.com",
    "https://api.stripe.com",
    "https://api.sendcloud.com",
    "https://api.minimax.io",
    "https://*.ingest.sentry.io",
    "https://vitals.vercel-insights.com",
    "https://api.commerce.coinbase.com",
  ].join(" "),
  "frame-src 'self' https://js.stripe.com https://commerce.coinbase.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ")

// Security headers that are static across all routes.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
]

const config: NextConfig = isDemoBuild
  ? {
      // Static-export demo build for Netlify. Drops every runtime feature
      // (server actions, native bindings, image optimizer) that requires a
      // Node server. Headers/redirects are declared in netlify.toml because
      // `next.config.headers()` is a no-op under `output: "export"`.
      reactStrictMode: true,
      poweredByHeader: false,
      typescript: { ignoreBuildErrors: false },
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      distDir: process.env.NEXT_DIST_DIR ?? ".next",
      outputFileTracingRoot: process.cwd(),
    }
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      typescript: { ignoreBuildErrors: false },
      serverExternalPackages: ["postgres", "argon2"],
      output: "standalone",
      // Allow verification builds to use a separate directory so they don't
      // clobber a running dev server's `.next` cache.
      distDir: process.env.NEXT_DIST_DIR ?? ".next",
      outputFileTracingRoot: process.cwd(),
      experimental: {
        serverActions: { bodySizeLimit: "2mb" },
      },
      images: {
        formats: ["image/avif", "image/webp"],
        // Remote sources (Sanity/R2/Unsplash) are content-addressed or stable;
        // a week keeps the optimizer cache warm without the year-long override.
        minimumCacheTTL: 604_800,
        remotePatterns: [
          { protocol: "https", hostname: "cdn.sanity.io" },
          { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
          { protocol: "https", hostname: "images.unsplash.com" },
        ],
      },
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: securityHeaders,
          },
          {
            // Long-cache hashed assets emitted by Next/Tailwind.
            source: "/_next/static/(.*)",
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
          },
          {
            source: "/(.*).(svg|png|jpg|jpeg|webp|avif|ico)",
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=86400, stale-while-revalidate=604800",
              },
            ],
          },
        ]
      },
    }

export default isDemoBuild
  ? withNextIntl(config)
  : withSentryConfig(withNextIntl(config), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      // Upload hidden source maps only when a token is available; local/CI builds
      // without Sentry credentials skip the upload instead of failing.
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
        deleteSourcemapsAfterUpload: true,
      },
      tunnelRoute: "/api/sentry-tunnel",
    })
