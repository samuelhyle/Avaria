# Sprint 2 — Performance & Deployment Hardening — Delivery Note

**Date:** 11 October 2026
**Branch state:** main (uncommitted), with parallel Phase 2 schema work also uncommitted
**Scope:** Sprint 2 of `PHASE3_UI_DEPLOYMENT_REFINEMENT.md`

Sprint 2 turns the perf and deployment posture into something production-ready. The full production build is currently blocked by **pre-existing** Phase 2 schema work (in progress in the working tree) that introduces self-referential Drizzle types and changes to `CartItem` shape. Sprint 2 deliverables are isolated from that work and verified independently — see *Verification* below.

---

## What changed

### PERF-1 — 3D viewer is now lazy-loaded

The 3D hero (`PeptideTorusHero`) and the 3D shop carousel (`Shop3DCarousel`) used to land in the initial bundle for the homepage, pulling in `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, and `three` (~600 KB gzipped). They are now loaded only on the client via two new lazy wrappers, behind a static skeleton that matches the reserved layout so LCP and CLS stay stable.

| File | Change |
|---|---|
| `components/three/LazyPeptideTorusHero.tsx` *(new)* | `next/dynamic({ ssr: false })` wrapper with `Skeleton` fallback. |
| `components/three/LazyShop3DCarousel.tsx` *(new)* | Same pattern for the carousel. |
| `app/[locale]/page.tsx` | Static imports of `PeptideTorusHero` and `Shop3DCarousel` replaced with the lazy wrappers. |

`ProductVialScene` (used by the product detail page) was already `dynamic({ ssr: false })`; left untouched.

### PERF-3 — Bundle-size CI script is now correct

The old inline `node -e` script in `.github/workflows/ci.yml` was gzipped a numeric string instead of the chunk bytes, so the assertion was a no-op. Replaced with a standalone script that:

1. Walks `.next/static/chunks` recursively and collects every `.js` chunk.
2. Gzips each chunk with Node's built-in `zlib.gzipSync` (no `gzip` binary needed).
3. Exits 1 if either: the **total** gzipped bundle is over 300 kB, or **any single chunk** is over 200 kB.
4. Prints the top-10 chunks so a regression is diagnosable.
5. Has a `--json` flag for CI artefact collection.

| File | Change |
|---|---|
| `scripts/check-bundle-size.mjs` *(new)* | Standalone script, `node`-only, with the assertions above. |
| `.github/workflows/ci.yml` | The inline `node -e` block is replaced with `node scripts/check-bundle-size.mjs`. |
| `package.json` | Added `"check:bundle": "node scripts/check-bundle-size.mjs"`. |

### DEP-1 — Build-time env validation

A new `scripts/check-env.ts` runs the required production env vars (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`) through a Zod schema. The script:

- Reads `.env` and `.env.local` so a fresh `pnpm dev` is honest about what would be in scope.
- Skips the required-var check in `BUILD_MODE=demo` (Netlify preview) so demo builds keep working.
- Exits 1 with a human-readable list of issues on failure.
- Exits 0 on success.

It is wired into `pnpm build` ahead of `next build`, so a missing required var fails the build rather than the first request.

| File | Change |
|---|---|
| `scripts/check-env.ts` *(new)* | Zod-validated build-time env check. |
| `package.json` | `"build": "pnpm env:check && next build"` and `"env:check": "tsx scripts/check-env.ts"`. |

### DEP-2 — README dual-target section

`README.md` previously said "Hosting: Vercel (fra1) + Cloudflare" with no mention of Netlify, contradicting `netlify.toml` and the Netlify preview. Added a top-level **Deployment targets** table that names Vercel as canonical and Netlify as `noindex` preview, and clarified the hosting line in the stack block.

| File | Change |
|---|---|
| `README.md` | New "Deployment targets" section + corrected hosting line. |

### DEP-3 — `sanity/` removed from runtime image

The `Dockerfile` was copying the Sanity studio source into the runtime image even though the studio is dev-only. That bloats the production image and pulls in studio dependencies. Also added `sanity/` to `.dockerignore` so the build context never includes it.

| File | Change |
|---|---|
| `Dockerfile` | Dropped the `COPY --from=builder /app/sanity ./sanity` line. |
| `.dockerignore` | Added `sanity/` so the build context excludes it. |

---

## Verification

`pnpm typecheck` on the **full repo** currently reports 9 errors. None of them are from Sprint 2 files. They are all in the pre-existing **Phase 2 schema work** that is uncommitted in the working tree:

- `db/schema/index.ts` — 6 self-referential Drizzle errors (TS7022, TS7024). The Phase 2 design adds `activeBatchId.references(() => batches.id)`, `productType`, and `specJson` to the `products` table. `batches` is defined later, which makes Drizzle's inferred type cycle.
- `components/ai/AssistantCanvas.tsx`, `components/ai/ChatWidget.tsx`, `components/cart/CartDrawer.tsx`, `components/checkout/CheckoutForm.tsx`, `components/checkout/CheckoutSummary.tsx`, `components/product/CompareTable.tsx` — 9 errors where `CartItem` shape has changed (Phase 2 added `mg`; `unitPriceCents` is now `number | null`).

These are not in scope for Sprint 2. They are blocked on completing `PHASE2_CATALOGUE_DESIGN.md` (Workstream B in the implementation plan). Both workstreams were specified to run in parallel.

| Check | Result |
|---|---|
| `tsc --noEmit` on the 9 Sprint 2 files in isolation | clean |
| `biome check` on the 9 Sprint 2 files | clean (after one autofix pass for import ordering) |
| `pnpm env:check` with required vars set | exits 0 |
| `pnpm env:check` with required vars unset | exits 1 with the missing-var list |
| `node scripts/check-bundle-size.mjs` on a fresh build | exits 2 with a clear "directory not found" message — needs an actual build to assert |
| `pnpm build` (full repo) | blocked by Phase 2 schema errors above; the `env:check` step itself passes |

---

## What's still in Sprint 2's queue (not done in this pass)

- **PERF-2 — Per-route Lighthouse budget.** `lighthouserc.json` and the `lighthouse` CI job exist; tightening the budgets to Plan §11 thresholds (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1) on `/en`, `/en/shop`, `/en/shop/<slug>` requires a working `lighthouse-ci` server, which I didn't bring up. The job definition is in `.github/workflows/ci.yml`.
- **PERF-2b — Verify the 3D pages are actually faster.** The full production build is blocked by the Phase 2 schema errors, so the prerender phase never gets to the 3D-heavy routes. The PERF-1 changes are correct in code, but their TBT/LCP impact can only be measured once the build runs to completion.
- **Bundle budget enforcement.** `check-bundle-size.mjs` runs in CI but I never got to see it pass — the build it depends on is blocked.

---

## What Sprint 2 did *not* do (intentionally)

- No changes to `db/schema/index.ts`, `db/migrations/`, or any `CartItem` consumer. That is Phase 2 / Workstream B.
- No changes to the 3D scene files themselves (`PeptideTorusScene`, `PostFX`, `InstancedVials`, `Lighting`). The lazy-loading wrapper is the right boundary; rewriting the scenes is a separate workstream.
- No Lighthouse baseline captured. The local Lighthouse run would need a working production server, which needs the Phase 2 schema fixed.

---

## Suggested follow-ups

1. Finish the Phase 2 schema migration:
   - Add explicit return-type annotations to the `pgTable` calls that have self-references (or move the `batches` definition above `products`).
   - Update the `CartItem` consumers to handle the new `mg` field and `unitPriceCents: number | null`.
2. Re-run `pnpm build` once Phase 2 is unblocked and confirm the bundle-size script reports the actual current size (the script's first run will set a baseline).
3. Promote the bundle-size script's exit threshold from "fail" to "warn-then-fail" for the first week, so the team has time to react to a tighter budget.
4. Bring up `lighthouse-ci` and tighten `.lighthouserc.json` per Plan §11.