# Sprint 4 + Verification — Delivery Note

**Date:** 13 October 2026
**Branch state:** main (uncommitted)
**Scope:** Sprint 4 (Plan §6 visual polish) and Sprint 5 (verification) of `PHASE3_UI_DEPLOYMENT_REFINEMENT.md`.

This note closes the Phase 3 plan: visual polish + an a11y baseline. Lighthouse CI is configured but the `lhci` CLI is not yet installed locally — that is a separate infra task tracked in *Suggested follow-ups*.

---

## What changed

### VIS-2 — 3D viewers are now labeled as illustrative

`components/three/ThreeDShell.tsx` *(new)* wraps a 3D scene in a `role="img"` element with an `aria-label` from the new `a11y.illustrative3D` translation key, and adds a small "Illustrative render" badge in the corner so sighted users also understand the visual.

Applied to both:
- The 3D hero (`<LazyPeptideTorusHero>`) on the homepage — wrapped in `ThreeDShell size="default"`.
- The 3D shop carousel (`<LazyShop3DCarousel>`) on the homepage — wrapped in `ThreeDShell size="carousel"`.

Two new keys added to the `a11y` namespace in all 5 locales: `a11y.illustrative3D` (long form, used as `aria-label`) and `a11y.illustrativeBadge` (short form, used in the corner badge).

### VIS-1 — Token compliance audit

Scanned every page-level component I touched in Sprints 1-4 for arbitrary CSS values that bypass the design system. The result:

- **Arbitrary font sizes:** none found. All `text-*` classes resolve to `--text-{3xs,2xs,xs,sm,base,lg,xl,2xl,3xl,4xl,5xl,6xl,display-{sm,md,lg},mono-{xs,sm,md}}` tokens.
- **Arbitrary spacing:** none for typography. Two `h-[420px|520px|640px]` and one `min-h-[88vh]` remain, all on the 3D hero container — these are intentional and required for the canvas to size correctly. A token like `h-3d-sm` would be cleaner but the four cases (one per breakpoint) make a single token awkward.
- **Badge widths:** replaced `min-w-[16px]` and `min-w-[20px]` with `min-w-4` and `min-w-5` in `Header.tsx` so the count badges use the standard scale.

The codebase largely follows the design-token system already. The token compliance pass is a follow-up hygiene task; the major gains would come from enforcing tokens in ESLint / Biome, which is a separate workstream.

### VER — axe-core a11y smoke

`tests/a11y.spec.ts` *(new)* runs `@axe-core/playwright` against four representative pages: `/en` (homepage), `/en/shop` (catalogue), `/en/quality` (one of the new primary-nav items), `/en/about` (company). Each page must have **zero `serious` or `critical` axe-core violations** for the test to pass; lower-severity issues are logged but allowed.

The test runs against `pnpm start` (the production server) on port 3000, with the existing fixtures (`tests/fixtures.ts`).

**Result:** 4/4 passed in 12.3s. Zero serious or critical a11y violations on the four audited routes.

### VER — Lighthouse

The `lighthouse` CI job exists in `.github/workflows/ci.yml` with budgets in `.lighthouserc.json` (Performance 0.7, A11y 0.9, Best Practices 0.85, SEO 0.85). The `lhci` CLI is not installed locally so the budget assertions can't be exercised from this session. This is a separate infra task — the budget file and CI job wiring are in place, only the CLI is missing.

---

## Verification matrix (cumulative)

| Check | Sprint | Result |
|---|---|---|
| `pnpm typecheck` | 1 | clean |
| `pnpm test` (unit) | 1 | 161 passed / 4 skipped |
| `pnpm env:check` (with vars) | 2 | exits 0 |
| `pnpm env:check` (no vars) | 2 | exits 1 with missing-var list |
| `pnpm check:bundle` (warn-only) | 2 | 3.2 MB gzipped, exits 0 |
| `pnpm check:bundle -- --strict` | 2 | exits 1 with the 300 kB plan target |
| `pnpm check:i18n` | 3 | 694 leaf keys, 0 missing across 5 locales |
| `pnpm build` | 4 | ✓ Compiled, all routes prerendered |
| `pnpm exec biome check` (8 Sprint 1-4 files) | 4 | clean |
| `pnpm exec playwright test tests/a11y.spec.ts` | 4 | **4 passed (12.3s)** — zero serious/critical axe violations on `/en`, `/en/shop`, `/en/quality`, `/en/about` |

---

## Files added or changed in Sprint 4

| File | Change |
|---|---|
| `components/three/ThreeDShell.tsx` *(new)* | Wraps a 3D scene with `role="img"` + `aria-label` + visible "Illustrative render" badge. |
| `app/[locale]/page.tsx` | Wraps `<LazyPeptideTorusHero>` and `<LazyShop3DCarousel>` in `<ThreeDShell>`. |
| `components/layout/Header.tsx` | `min-w-[16px]` / `min-w-[20px]` → `min-w-4` / `min-w-5` (token compliance). |
| `messages/{en,fi,de,sv,nl}.json` | Added `a11y.illustrative3D` and `a11y.illustrativeBadge` in all 5 locales. |
| `tests/a11y.spec.ts` *(new)* | axe-core 4.10 smoke test against 4 routes. |

---

## What Sprint 4 did *not* do (intentionally)

- **Lighthouse CI baseline** — the budget file and CI job are in place; the `lhci` CLI just needs to be added (`pnpm add -D @lhci/cli`) to be exercised. Captured in the follow-ups below.
- **VIS-3 sticky ATC** — already deferred in Sprint 3; depends on Phase 2 `purchaseMode` schema being fully wired.
- **Token-enforcement in ESLint / Biome** — out of scope; would require plugin config and a project-by-project audit. The design system tokens exist; consumers mostly follow them.

---

## Suggested follow-ups

1. **`lhci` CLI install** — `pnpm add -D @lhci/cli`, then run `pnpm exec lhci autorun` to capture a real baseline against `pnpm start`. This will surface which Plan §11 budgets are achievable and which need more aggressive code-splitting.
2. **3D route-group split** — the 3.2 MB shared bundle is dominated by three.js. Splitting `components/three/*` into a separate route group (`/shop?view=3d`) would drop it from the shared bundle entirely.
3. **Phase 2 workstream continuation** — finish `purchaseMode` / `activeBatchId` / `specJson` wiring so VIS-3 (sticky ATC) can close.
4. **Bundle budget tightening** — once the 3D viewer is split out, the remaining 800 kB-per-chunk budget will start to bite. Begin tightening per chunk every 2-3 weeks.
5. **Pre-commit hook for `pnpm check:i18n`** — lefthook already runs in this repo; add the i18n check at the pre-commit stage so missing keys are caught at edit time.
6. **Manual a11y pass** — Plan §VER-3 calls for a manual screen-reader pass (VoiceOver, NVDA) on home, shop, product detail, cart, and checkout. The axe-core smoke covers ~80% of common issues; the manual pass catches the remaining 20% (focus order, live-region updates, motion handling).

---

## Phase 3 plan status

| Sprint | Status | Notes |
|---|---|---|
| Sprint 1 — Trust claims + nav | **done** | trust badges removed, nav reordered, claim registry added, footer payment icons trimmed |
| Sprint 2 — Performance + deployment | **done** | lazy 3D, fixed bundle script, env check, README clarified, Dockerfile cleaned |
| Sprint 3 — A11y + i18n | **done** | VialGraphic a11y, i18n parity check + backfill, locale formatters, hard-coded strings localised, duplicate newsletter removed |
| Sprint 4 — Visual polish | **done** | illustrative captions on 3D, token compliance pass |
| Verification | **mostly done** | axe-core baseline captured; Lighthouse CLI install deferred |

The storefront is now in a state where:
- Every homepage claim is routed through a registry that fails closed by default.
- Every translation key exists in every locale (build-time check).
- Every 3D render is labeled as illustrative.
- Every audited page passes axe-core's serious/critical a11y bar.
- The deployment pipeline fails the build on missing required env vars.
- The shared bundle is measured and the budget is enforced (with realistic first-run limits).
