/**
 * Build-mode discriminator for the static Netlify demo.
 *
 * `BUILD_MODE=demo` switches the app into a pure-static, no-backend preview:
 *   - catalogue, blog, glossary, marketing pages pre-render to HTML
 *   - DB, Auth, Stripe, AI, Sanity, Sendcloud are stubbed or short-circuited
 *   - cart/checkout UI still renders client-side, but server endpoints 404
 *
 * Set the env var via the demo build script (`scripts/build-demo.sh`) or
 * directly: `BUILD_MODE=demo pnpm build`.
 */
export const BUILD_MODE_DEMO = "demo" as const

export function isDemoBuild(): boolean {
  return process.env.BUILD_MODE === BUILD_MODE_DEMO
}

export function assertNotDemo(feature: string): void {
  if (isDemoBuild()) {
    throw new Error(
      `[demo] Feature "${feature}" is not available in the Netlify demo build. The demo only ships static marketing + catalogue pages.`,
    )
  }
}

/**
 * Route-segment config exports must be statically resolvable, so they can't
 * be inline conditionals. Import this constant instead and reference it:
 *
 *   export const dynamic = DYNAMIC
 *
 * Resolves to "force-dynamic" in production and "auto" for the static demo
 * build (where every dynamic page is excluded from the export anyway).
 */
export const DYNAMIC = (isDemoBuild() ? "auto" : "force-dynamic") as "auto" | "force-dynamic"

export const REVALIDATE = isDemoBuild() ? false : 0
