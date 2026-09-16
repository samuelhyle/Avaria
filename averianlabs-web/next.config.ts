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

// Netlify's Next.js Runtime plugin bundles each route handler as a Netlify
// Function from the standard `.next/server/app/*` tree. It does NOT support
// `output: "standalone"` — when that flag is set, the plugin doesn't pick up
// per-route handlers and the deploy lands on a blank page (everything 404s
// or hits the default error route). Netlify always exports `NETLIFY=true`,
// so we drop standalone there and rely on the plugin's own bundler.
const isNetlifyDeploy = process.env.NETLIFY === "true"

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
      // Native / heavy modules that shouldn't be bundled into the server
      // handler. Netlify's deploy upload rejected ___netlify-server-handler
      // because the App Router bundle included the ONNX runtime, three.js,
      // PDF viewer, etc. Marking these as external lets Node load them at
      // runtime from the function's `node_modules/` instead of inlining them.
      // Anything that's only used client-side (three, drei, react-pdf) is
      // additionally excluded from file tracing below — those are pulled
      // into SSR by accident via shared utilities.
      serverExternalPackages: [
        "postgres",
        "argon2",
        "@huggingface/transformers",
        "onnxruntime-node",
        "sharp",
      ],
      // Standalone output is only used for the Docker production image
      // (see `Dockerfile`). The Netlify plugin needs the regular
      // `.next/server` tree to package route handlers as Functions.
      ...(isNetlifyDeploy ? {} : { output: "standalone" as const }),
      // Allow verification builds to use a separate directory so they don't
      // clobber a running dev server's `.next` cache.
      distDir: process.env.NEXT_DIST_DIR ?? ".next",
      outputFileTracingRoot: process.cwd(),
      // Strip client-only bundles from the server trace. These reach the
      // server bundle via the `react-three/*` `assistant` page and the
      // Sanity Studio. Each is megabytes of JS that never executes on the
      // server but inflates ___netlify-server-handler past Netlify's
      // deploy-upload body limit. pnpm flattens everything under
      // `node_modules/.pnpm/<name>@<version>/node_modules/<name>/`, so the
      // glob must include `.pnpm/`.
      outputFileTracingExcludes: {
      "*": [
        "node_modules/.pnpm/@react-three+fiber*/**",
        "node_modules/.pnpm/@react-three+drei*/**",
        "node_modules/.pnpm/@react-three+postprocessing*/**",
        "node_modules/.pnpm/three*/**",
        "node_modules/.pnpm/postprocessing*/**",
        "node_modules/.pnpm/react-pdf*/**",
        "node_modules/.pnpm/pdfjs-dist*/**",
        "node_modules/.pnpm/@huggingface+transformers*/**",
        "node_modules/.pnpm/onnxruntime-node*/**",
        "node_modules/.pnpm/@img+sharp*/**",
        "node_modules/.pnpm/@img+colour*/**",
      ],
      },
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

// Sentry's `withSentryConfig` wrapper injects ~30 files worth of build
// tooling into the server bundle. The Netlify plugin can't split the
// monolithic `___netlify-server-handler` (App Router limitation), so the
// wrapper pushes the bundle past Netlify's deploy-upload body limit when
// Sentry is configured. On Netlify, skip the wrapper and rely on the
// `/api/sentry-tunnel` route + server-side console logging instead.
const maybeWithSentry = (cfg: NextConfig): NextConfig =>
  isNetlifyDeploy
    ? cfg
    : withSentryConfig(cfg, {
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

export default isDemoBuild ? withNextIntl(config) : maybeWithSentry(withNextIntl(config))
