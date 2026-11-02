import { withSentryConfig } from "@sentry/nextjs/config"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts")

const isDemoBuild = process.env.BUILD_MODE === "demo"

/**
 * Whether this build targets Netlify.
 *
 * Netlify always exports `NETLIFY=true`, so it is the reliable signal for
 * the platform-specific build settings below.
 */
const isNetlifyDeploy = process.env.NETLIFY === "true"

// Next.js dev mode (webpack HMR + source maps) requires `unsafe-eval`.
// Never allow it in production.
const isDev = process.env.NODE_ENV === "development"
const documentOrigins = [
  process.env.R2_PUBLIC_URL,
  process.env.R2_PUBLIC_BASE_URL,
  process.env.NEXT_PUBLIC_R2_BASE_URL,
].flatMap((value) => {
  try {
    const url = new URL(value ?? "")
    return url.protocol === "https:" ? [url.origin] : []
  } catch {
    return []
  }
})
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

/**
 * The Content-Security-Policy.
 *
 * `upgrade-insecure-requests` is only correct where the site is actually served
 * over TLS. On a plain-HTTP local server it upgrades the browser's own
 * subresource requests — including Next.js's RSC payload fetches — to `https://`,
 * which the server cannot answer, and every client-side navigation fails with
 * `ERR_SSL_PROTOCOL_ERROR`.
 *
 * Whether the site is served over TLS is known from `AUTH_URL`, the canonical
 * origin the application is configured with. It is `http://localhost:3000`
 * locally and `https://…` in production, so the directive is included exactly
 * where it belongs.
 */
const siteIsHttps = (process.env.AUTH_URL ?? "https://").startsWith("https://")

const buildCsp = (upgradeInsecureRequests: boolean) =>
  [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io https://*.r2.cloudflarestorage.com https://images.unsplash.com",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://*.r2.cloudflarestorage.com",
      "https://*.r2.dev",
      ...documentOrigins,
      "https://*.sanity.io",
      "https://eu.i.posthog.com",
      "https://eu-assets.i.posthog.com",
      "https://api.stripe.com",
      // The Sendcloud panel is the host the shipping code actually calls. The
      // old entry was `api.sendcloud.com`, which nothing uses.
      "https://panel.sendcloud.sc",
      // Chain explorers the crypto watcher polls. Server-side fetches are not
      // bound by the document's CSP, but a browser-side call would be.
      "https://mempool.space",
      "https://api.trongrid.io",
      "https://api.etherscan.io",
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
    ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ].join("; ")

// Security headers that are static across all routes.
const securityHeaders = [
  ...(process.env.NEXT_PUBLIC_REVIEW_SITE === "true"
    ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
    : []),
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
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
      // Keep localized metadata in the initial head. Streaming metadata produced
      // intermittent hydration mismatches during full-page deployment checks.
      htmlLimitedBots: /.*/,
      poweredByHeader: false,
      typescript: { ignoreBuildErrors: false },
      serverExternalPackages: ["postgres", "argon2"],
      output: "standalone",
      outputFileTracingIncludes: {
        "/api/forum/*": ["./lib/ai/prompts/community-moderator.md"],
        "/api/cron/*": ["./lib/ai/prompts/community-moderator.md"],
      },
      // Allow verification builds to use a separate directory so they don't
      // clobber a running dev server's `.next` cache.
      distDir: process.env.NEXT_DIST_DIR ?? ".next",
      outputFileTracingRoot: process.cwd(),
      // Netlify functions run on Linux without a GPU. Keep Linux CPU bindings
      // and shared library; shipping every ONNX platform/CUDA library exceeds
      // the function upload limit. Other deployment targets retain their traces.
      ...(process.env.NETLIFY
        ? {
            outputFileTracingExcludes: {
              "*": [
                "./node_modules/.pnpm/@react-three+fiber*/**",
                "./node_modules/.pnpm/@react-three+drei*/**",
                "./node_modules/.pnpm/@react-three+postprocessing*/**",
                "./node_modules/.pnpm/three*/**",
                "./node_modules/.pnpm/postprocessing*/**",
                "./node_modules/.pnpm/react-pdf*/**",
                "./node_modules/.pnpm/pdfjs-dist*/**",
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/darwin/**",
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/win32/**",
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/*/libonnxruntime_providers_cuda.so",
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/*/libonnxruntime_providers_tensorrt.so",
                // The native binaries for the platform the build ran on. The
                // hosted build runs on Linux, so the macOS and Windows
                // variants can never be executed — but the trace still
                // carried them, because they are optional dependencies of
                // the same package. They were 58 MiB of the 179 MiB trace:
                // uploaded to the function and read back on every cold
                // start, for nothing.
                "./node_modules/.pnpm/@swc+core-darwin-*/**",
                "./node_modules/.pnpm/@swc+core-win32-*/**",
                "./node_modules/.pnpm/@esbuild+darwin-*/**",
                "./node_modules/.pnpm/@esbuild+win32-*/**",
                "./node_modules/.pnpm/@img+sharp-darwin-*/**",
                "./node_modules/.pnpm/@img+sharp-win32-*/**",
                "./node_modules/.pnpm/@img+sharp-libvips-darwin-*/**",
                "./node_modules/.pnpm/@img+sharp-libvips-win32-*/**",
                "./node_modules/.pnpm/argon2@*/node_modules/argon2/prebuilds/darwin*/**",
                "./node_modules/.pnpm/argon2@*/node_modules/argon2/prebuilds/win32*/**",
              ],
            },
            outputFileTracingIncludes: {
              "/api/forum/*": ["./lib/ai/prompts/community-moderator.md"],
              "/api/cron/*": ["./lib/ai/prompts/community-moderator.md"],
              "/api/ai/*": [
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/*/onnxruntime_binding.node",
                "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/*/libonnxruntime.so.1",
              ],
            },
          }
        : {}),
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
        const cspHeader = {
          key: "Content-Security-Policy",
          value: buildCsp(siteIsHttps),
        }
        return [
          {
            source: "/(.*)",
            headers: [...securityHeaders, cspHeader],
          },
          {
            // The storefront's catalogue pages are the same for every
            // visitor, so the CDN can serve them without invoking the
            // origin. Before this, every request paid for a cold function
            // start: the live site answered eight requests a second with a
            // p95 of 7.7 seconds.
            //
            // `s-maxage` is the shared-cache lifetime. The catalogue itself
            // is cached for a minute, so a page cannot be more stale than
            // the prices it shows. `stale-while-revalidate` lets the edge
            // keep serving the page while the origin re-renders it, so a
            // traffic spike does not become a stampede of cold starts.
            //
            // The path list and the session check are the same two
            // conditions `middleware.ts` applies, expressed here because
            // Next.js replaces the `Cache-Control` a middleware sets with
            // the one the render produced — a header from the config is
            // applied after the render and survives.
            //
            // A signed-in visitor is never cached: their pages carry their
            // own session.
            source:
              "/:locale(en|fi|sv|ru)/:page(about|blog|certificates|coa|community/rules|compare|contact|documents|faq|forgot-password|glossary|lab-tests|legal|newsletter|partner|quality|register|research-tools|reset-password|rewards|shop|support|verify-email|wishlist)/:rest*",
            missing: [
              { type: "cookie", key: "authjs.session-token" },
              { type: "cookie", key: "__Secure-authjs.session-token" },
            ],
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
              },
            ],
          },
          {
            // The home page: the locale and nothing after it.
            source: "/:locale(en|fi|sv|ru)",
            missing: [
              { type: "cookie", key: "authjs.session-token" },
              { type: "cookie", key: "__Secure-authjs.session-token" },
            ],
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
              },
            ],
          },
          {
            // Long-cache hashed assets emitted by Next/Tailwind.
            source: "/_next/static/(.*)",
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
          },
          {
            source: "/(.*).(svg|png|jpg|jpeg|webp|avif|ico|woff2)",
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
