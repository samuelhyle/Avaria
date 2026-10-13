# Phase 3 — UI & Frontend Deployment Refinement Plan

**Date:** 11 October 2026
**Status:** Proposed refinement plan; no changes deployed
**Companion documents:** `AverianLabs_Implementation_Plan.md`, `PHASE1_INVENTORY.md`, `PHASE2_CATALOGUE_DESIGN.md`

This plan turns the existing demo's UI and frontend-deployment posture into something that can ship to production. It draws on (a) the structural review of the codebase and (b) the 14 P0/P1 defects already accepted in the Implementation Plan. It is sequenced so that nothing proposed here depends on evidence we do not yet have; anything that does is called out and gated.

The plan covers six areas: (1) what's already good and must not regress, (2) the UI defects worth fixing before launch, (3) the deployment story, (4) performance, (5) accessibility & i18n, and (6) a sequenced backlog with acceptance criteria.

---

## 1. What is working — must not regress

The codebase is well above the median for a same-stage Next.js project. Keep these.

| Area | What's good | Where it lives |
|---|---|---|
| Design system | One token set: colour, radius, duration, ease, type scale, container widths | `styles/globals.css` (Tailwind v4 `@theme`) |
| a11y primitives | Skip link, focus ring, `prefers-reduced-motion` blanket, `aria-live` cart count, sticky transparent overlays that keyboard close | `components/layout/Header.tsx`, `styles/globals.css`, `components/layout/MobileMenu.tsx` |
| i18n shape | Five locales, server-side messages with a trimmed client-side namespace list (so RSC payloads stay small), static `generateStaticParams` | `app/[locale]/layout.tsx`, `messages/*.json`, `lib/i18n/` |
| Security headers | HSTS preload, `nosniff`, `frame-ancestors`, full `connect-src` allow-list, CSP for Stripe/Coinbase/PostHog | `next.config.ts` (`securityHeaders`, `csp`) |
| Build modes | Two clean outputs: `standalone` for Vercel, `output: "export"` for the Netlify demo; both branch on `BUILD_MODE` | `next.config.ts` |
| Idempotency | `webhook_events` primary key `{provider}:{eventId}` prevents double fulfilment | `lib/orders/`, `PHASE1_INVENTORY.md §4` |
| CI | Five parallel jobs (quality / bundle-size / build / e2e / a11y / lighthouse) with explicit shared-chunk budget | `.github/workflows/ci.yml` |
| Observability | Sentry (with optional sourcemap upload), PostHog EU, Vercel Speed Insights — all opt-out at zero config | `next.config.ts` (Sentry), `components/layout/PostHogProvider.tsx`, `components/layout/VercelInsights.tsx` |
| Typed cart | Zustand stores for cart/wishlist/compare with persisted hydration (`CartHydration.tsx`) | `lib/cart/store.ts`, `components/cart/CartHydration.tsx` |

---

## 2. UI defects to fix before launch

These are the user-visible issues that should be addressed in the next sprint regardless of evidence-blocking P0 work. They are arranged by impact, not by effort.

### 2.1 Unsubstantiated trust claims (CLAIM-01, PAY-01, FORMAT-01)

The homepage and footer carry several claims that have not been verified against evidence on the public site. The Implementation Plan treats `CLIENT-01` / `PAY-01` as P0/P1 blockers, so these cannot stay in their current form for production.

| Where | Claim | Why it must change |
|---|---|---|
| `app/[locale]/page.tsx:50-86` | "98.9% Average purity", "2400+ Verified labs", "24h EU dispatch" hero stats | No claim-to-evidence owner; the plan forbids count-up animation on scientific measurements (Plan §6 / §10) |
| `app/[locale]/page.tsx:70-73` | Hero stats array hard-copies "Average purity", "Verified labs", "EU dispatch" English text inside a translation file lookup | Plan §10 forbids raw English fallback in non-EN locales |
| `components/layout/Header.tsx:62-99` | Top bar: "EU dispatched", "HPLC verified", "Free shipping", "COA every batch", "Dispatch 24h" stacked across breakpoints | Plan §8 requires dispatch and transit to be separated; §6 requires each claim to have an evidence owner |
| `components/layout/Footer.tsx:100-112` | "Stripe-secured", "GDPR compliant", "24h EU dispatch" badges in footer | PAY-01 — provider config has not been verified; "Stripe-secured" is misleading until payment integrations are tested |
| `components/layout/Footer.tsx:142-215` | Payment icon row: Visa / Mastercard / Amex / PayPal / Apple Pay / Google Pay / Coinbase | Plan §7 / §11 — only verified, usable methods may appear at checkout; the icon set implies more options than the integration supports |
| `app/[locale]/page.tsx:344-368` | Subscription section promises "Lock in your batch, save 10%, never run out" and "10% off every vial, no minimum" | Plan §7 forbids automatic recurring purchase claims until reservation/expiry logic exists; Plan §6 forbids promising a particular batch without reservation logic |
| `components/product/ProductCard.tsx:104-110` | "Low · {n} left" badge uses raw interpolation key when locale is missing | FORMAT-01 — KLOW key shown untranslated |
| `app/[locale]/page.tsx:228-281` | Inline "Certificate of Analysis" mock card with hard-coded batch code, "99.4%" purity, "Eurofins Biolab" lab name | Uses unverified sample numbers; do not embed mock supplier names on production |

**Refinement:**

1. Replace the three hero `CountUp` stats with non-numeric, evidence-safe copy that still anchors the value proposition (e.g., "HPLC-tested batches · EU dispatched"). Apply `respect prefers-reduced-motion` (already in `globals.css`).
2. Move all marketing claims to a single registry (`lib/claims/registry.ts`) keyed by claim ID. Render claims only when the registry returns `evidence: 'verified'`. Otherwise render a neutral placeholder or omit. This satisfies Plan §10 (claim-to-evidence register) and prevents "verified" badges from re-appearing accidentally.
3. Footer's payment icons should show only methods the integration accepts (`stripe_card`, `coinbase_commerce`). Replace PayPal / Apple Pay / Google Pay / Amex badges with a single "EUR + crypto" caption.
5. Delete the subscription section from the homepage until §7 inventory reservations and expiry support ship.
6. Delete or rebuild the "Certificate of Analysis" hero card to read from a real batch (`products.activeBatchId`) rather than hard-coded values; if no batch is linked, render an empty state.
7. Locale-aware formatting for stock badges: see `lib/utils/format.ts` — confirm `{n}` interpolates correctly for non-zero, and use `Intl.NumberFormat` everywhere stock counts are shown.

### 2.2 Primary navigation order (Plan §6)

`components/layout/Header.tsx:44-51` orders nav as Shop → Lab Tests → Calculator → Community → Blog → About. Plan §6 mandates: **Products → Batch verification → Quality → Support → Company**, with secondary resources (community, blog, calculator) in a submenu.

**Refinement:**

1. Re-order top-level nav to: Shop · Batch verification · Quality · Support · Company.
2. Move Calculator, Community, Blog, Glossary, Documents into the `MegaMenu` (or a `More` submenu) — `components/layout/MegaMenu.tsx` already exists and is the right place.
3. Keep the search ⌘K trigger, language switcher, theme toggle, account, wishlist, compare, cart — these belong to the chrome, not nav.
4. Remove the top-bar trust strip (lines 62-99) and fold its content into a single inline footer "Verified by" line that points to the Lab Tests page, where the actual evidence lives. This also resolves a stack-overflow risk on `sm` viewports.

### 2.3 Duplicate newsletter forms and promotional noise

`app/[locale]/page.tsx` has a newsletter form in three places: the `NewsletterModal` at the top (modal), the bottom-of-page `NewsletterForm` (line 431), and the `Footer` (`components/layout/Footer.tsx:71`). Plan §6 calls out "Remove duplicate newsletter forms and unfinished promotional sections."

**Refinement:**

1. Keep newsletter once: in the footer only.
2. Remove `components/home/NewsletterModal.tsx` from the homepage, or move it behind a `data-newsletter-dismissed` flag in `localStorage` so it does not reappear.
3. Remove `NewsletterForm` from the bottom of the homepage; the footer's form already covers the same surface.

### 2.4 Homepage sequence (Plan §6)

The Plan dictates a specific homepage order:

> Supplier proposition → Browse + Verify a batch → Compact product selection → Evidence of testing → Accurate dispatch/delivery → Institutional enquiry.

Current homepage order (sections in `app/[locale]/page.tsx`): Hero → Top bar → 3D Carousel → Featured products → Categories → Lab transparency mock → Calculator CTA → Community → Subscription → Institutional enquiry → Newsletter.

**Refinement:**

1. Reorder to match the plan.
2. The "Lab transparency" section currently uses unverified mock data (see §2.1.7). Replace with a "Verified batches" panel that lists released batches (`batches.releaseStatus = 'released'`) with the actual `hplcPurity` from `batches` and a working `View full PDF` link.
3. Calculator CTA stays — but it currently sits inside an `accent-soft → ice-soft` gradient section that visually outranks the verified evidence. Demote its visual weight so it does not look like the next call to action.
4. Remove the "Community" section (`ActivityFeed`) from the launch homepage per Plan §10 ("Remove unfinished articles, empty glossary links and empty community promotion from launch navigation").
5. Remove the subscription section (§2.1.5).
7. Institutional enquiry stays — it is one of the plan's six required homepage sections.

### 2.5 Product card: `CountUp` on purity, mock vial graphic

`components/product/ProductCard.tsx:159-165` renders a purity badge from `product.purityPercent`. Plan §6 forbids animating scientific measurements, and Plan §5 / DATA-01 forbids rendering purity from `products.purityPercent` — it must come from the active batch.

**Refinement:**

1. Read `purityPercent` from `getActiveBatch(product).hplcPurity`. If no active batch, render "Awaiting batch" instead of a percentage (Plan §5).
2. Drop the `CountUp` on the COA hero card on the homepage.
3. `VialGraphic` (`components/product/VialGraphic.tsx`) is illustrative only — label it as such in the alt text where used in the carousel, and add a note on the homepage 3D viewer: "Vial renders are illustrative."

### 2.6 3D viewer loaded eagerly (PERF-01)

`components/three/PeptideTorusHero.tsx` and `components/three/Shop3DCarousel.tsx` are imported directly in `app/[locale]/page.tsx` (lines 5-6). The plan and `PHASE1_INVENTORY.md §6` flag this as a performance risk.

**Refinement:**

1. Convert both to `next/dynamic({ ssr: false, loading: <Skeleton/> })`.
2. Do not load 3D until the user clicks "Browse in 3D" or scrolls into the section (IntersectionObserver gate). Plan §6: "Load 3D only after user interaction and provide a static fallback."
3. Provide a static `ProductCarousel` fallback that mirrors the 3D layout for users on `prefers-reduced-motion` or low-power devices.
4. Add a per-route Lighthouse budget assertion in CI (see §4.2).

### 2.7 Header logo and wordmark sizing

`components/layout/Header.tsx:103` uses `className="h-11"` on the Logo, but the Logo's `size="md"` already constrains the height. The dual sizing is redundant. Also, `showWordmark="responsive"` is set without checking the `Logo` prop shape (`components/layout/Logo.tsx`).

**Refinement:**

1. Verify `Logo`'s prop types accept `showWordmark` with the value `"responsive"`. If not, remove or fix.
2. Drop the duplicate `h-11` and rely on `size` to control the Logo height.

### 2.8 Footer payment icons (PAY-01)

See §2.1.4 above. Independently: the SEPA "icon" in `components/layout/Footer.tsx:191-195` renders the word "SEPA" inside an SVG `<text>` element. SVGs are decorative; the visual is "SEPA" as text, not a logo. This is acceptable, but the `aria-label="SEPA"` plus a visible "SEPA" makes the icon redundant for screen readers.

**Refinement:**

1. Replace inline `text` element with a `<span>` that uses the same chip styling, drop the SVG wrapper.

### 2.9 Sticky add-to-cart mobile (Plan §6)

`components/product/StickyMobileAtc.tsx` is referenced but not inspected. Plan §6 requires sticky purchase controls to obey the same state as the main panel (in-stock, contact-only, out-of-stock).

**Refinement:**

1. Audit the sticky control against the main `ProductDetailActions.tsx`: same `purchaseMode` source, same `isOut`, same `isLow`, same CTA label.
2. On quotation-only items, render "Request quote" instead of an ATC.

---

## 3. Frontend deployment posture

The repo currently has two outputs (`next.config.ts`) and one canonical target (Vercel), with the Netlify URL serving as a `noindex` preview. The Implementation Plan says "Retain the existing brand and Next.js frontend. Keep Netlify initially while assessing the repository and actual processing locations." `RUNBOOK.md` and `netlify.toml` agree: Netlify is a preview, Vercel is the production canonical.

### 3.1 Decide one canonical target

Decision needed before next deploy:

| Target | Pros | Cons |
|---|---|---|
| Keep Vercel primary + Netlify preview | Matches `RUNBOOK.md`, single-region (`fra1`), easy rollback, fastest Next.js build pipeline | Two deploy targets to maintain; environment variables duplicated |
| Keep Netlify primary + drop Vercel | The `BUILD_MODE=demo` path is well-tested; Node Functions cover the API surface; preview and prod can be the same deploy | README contradicts the runbook; region is not pinned in `netlify.toml`; production-grade hardening has been Vercel-targeted |

**Recommendation:** keep both, but make the boundary visible. The current setup is correct in shape but the README/runbook wording is internally inconsistent. Update `README.md` to describe the current dual-target setup (Vercel canonical, Netlify preview) and remove the contradiction.

### 3.2 Demo build's `X-Robots-Tag: noindex, nofollow`

`netlify.toml:50-54` adds `X-Robots-Tag: noindex, nofollow` and `Cache-Control: public, max-age=0, must-revalidate` to every response. This is correct for a preview.

**Refinement:**

1. Add a comment in `netlify.toml` linking to `RUNBOOK.md §9` explaining why these headers are set, so a future engineer does not remove them.
2. Add the same `noindex` policy to any preview URL behind authentication or feature flag (already done in `next.config.ts` for `isDemoBuild()`).
3. Verify that the Vercel canonical build does **not** set `noindex` — `next.config.ts` only sets it for the demo branch, so this is correct.

### 3.3 Build-time env validation

`lib/env.ts` validates env vars with Zod, but the validation runs lazily — a missing required var (`DATABASE_URL`, `AUTH_SECRET`) only surfaces at first request. This is fine for serverless, but for production deploys a missing required var should fail the build, not the first request.

**Refinement:**

1. Add a `validateBuildEnv()` script (`scripts/check-env.ts`) called from `pnpm build` (or via `next.config.ts` `onInit`). It runs the same Zod schema but exits non-zero if any required production var is unset.
2. Required prod vars: `DATABASE_URL`, `AUTH_SECRET` (≥16 chars), `AUTH_URL`. (Plan §9.)
3. Optional prod vars should still be visible (`SENTRY_DSN`, `STRIPE_*`, etc.) but only fail at request time if their endpoints are hit. Add a runtime warning to `lib/env.ts` when an `*_SECRET` or `*_KEY` is unset but the corresponding API is called.

### 3.4 CSP hardening

`next.config.ts:16-25` allows `'unsafe-inline'` in `script-src` because the storefront is ISR. The plan acknowledges this with a follow-up note. Two improvements available now:

1. **Per-request nonce for dynamic pages.** Use `headers()` + a Next.js Middleware nonce so dynamic responses get a strict CSP, while static/exported pages keep `'unsafe-inline'`. (`next.config.ts` comment already references the plan.)
2. **Remove PostHog EU asset host from `connect-src` if unused.** `eu-assets.i.posthog.com` is the asset host for the EU region; PostHog's `posthog-js` uses it for the recorder. Keep both `eu.i.posthog.com` and `eu-assets.i.posthog.com` in `connect-src` and `script-src`.

### 3.5 Dockerfile and runtime image

`Dockerfile` produces a slim `node:22-bookworm-slim` final image, but the `nodejs` user is unused after `COPY --chown=nextjs:nodejs`. Also, the runtime image copies `.next/standalone` plus `.next/static` plus `public` plus `sanity` — `sanity/` is the studio source and should not be in the runtime image.

**Refinement:**

1. Drop `COPY --from=builder --chown=nextjs:nodejs /app/sanity ./sanity` from the runtime stage. Studio is dev-only.
2. Add a `.dockerignore` rule for `sanity/` (already present per `.dockerignore`). Verify.
3. `USER nextjs` is correct, but `next.config.ts` uses `output: "standalone"`, which Next.js auto-traces — verify the standalone bundle includes only what's needed at runtime by running `pnpm build` and inspecting `.next/standalone`.
4. Add a non-root-required-uid check: the runtime image uses uid 1001, which is fine for most clusters, but Vercel ignores it. Document in the Dockerfile that Vercel does not use this image.

### 3.6 CI bundle-size budget

`.github/workflows/ci.yml` (`bundle-size` job) asserts a 300 KB gzipped shared-chunk budget. The assertion walks `.next/static/chunks` and sums JS bytes, then gzips. **Two issues:**

1. The script gzips a number, not the JS itself. The variable `gz` is the length of `gzipped: <total.toString()>`, which is trivial. The check is a no-op.
2. The threshold (300 KB) is in KB but the variable is compared in bytes (`> 307200`). 307 200 bytes = 300 KB. The unit is correct, but the implementation is wrong.

**Refinement:**

1. Rewrite the budget script to actually gzip the concatenated chunks:

```js
import { gzipSync } from 'zlib'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
const root = '.next/static/chunks'
let total = 0
for (const f of readdirSync(root, { recursive: true })) {
  if (!f.endsWith('.js')) continue
  total += statSync(join(root, f)).size
}
const gz = gzipSync(Buffer.alloc(total)).length // placeholder
// correct form:
const files = readdirSync(root, { recursive: true })
  .filter(f => f.endsWith('.js'))
  .map(f => readFileSync(join(root, f)))
const gz = gzipSync(Buffer.concat(files)).length
console.log('shared chunk gzipped:', gz)
if (gz > 307_200) process.exit(1)
```

2. Move the budget check to per-chunk thresholds rather than a single global threshold. Allow up to N chunks > 100 KB gzipped, plus a global ceiling.

### 3.7 Lighthouse and a11y in CI

Both jobs exist (`lighthouse`, `a11y`) but they depend on `build`, which depends on `quality`. The `e2e` job is independent from `lighthouse` — fine — but Lighthouse runs against a default URL only. `.lighthouserc.json` should point at `/en` and assert LCP/INP/CLS budgets per Plan §11.

**Refinement:**

1. Update `.lighthouserc.json` to assert LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Plan §11) on the homepage, `/en/shop`, `/en/shop/{any-slug}`, `/en/checkout`, `/en/account`.
2. Run `pnpm test:e2e` against `pnpm start` (already done in `e2e` job).
3. Add a `playwright.config.ts` sharding / parallel workers hint — currently default — and document why.

---

## 4. Performance

### 4.1 Initial JS includes the 3D bundle

`app/[locale]/page.tsx` imports `PeptideTorusHero` and `Shop3DCarousel` statically. Both pull `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, and `three` (~600 KB gzipped before tree-shaking). On the demo, this is the biggest contributor to a poor Lighthouse TBT.

**Refinement:**

1. Convert both imports to `next/dynamic({ ssr: false })` with a static `ProductCarousel` skeleton.
2. Move `three` to a peer / optional dep, or `pnpm`-bundle so it's only in the `/shop?view=3d` route. (Already on dynamic imports, but the dependency graph pulls it in eagerly because of the static import.)
3. Add an explicit chunk budget for the 3D viewer: ≤ 400 KB gzipped. If exceeded, fail CI.

### 4.2 Image optimisation

`next.config.ts` sets `formats: ['image/avif', 'image/webp']` and `minimumCacheTTL: 604800` for prod, but the demo build uses `images.unoptimized: true`. The homepage hero has no `<Image>` — it uses inline SVGs and the `VialGraphic`. Most product imagery is inline SVG too.

**Refinement:**

1. Audit every `<img>` / `<Image>` for `width` / `height` (CLS). `VialGraphic` is SVG so it does not skew CLS, but check `ProductGallery` (`components/product/ProductGallery.tsx`).
2. Add `priority` to the hero image once one is introduced. The hero is a 3D canvas — its LCP candidate is the canvas itself, which does not have a `priority` attribute. Wrap it with `next/dynamic` and use a CSS-based fallback background (`gradient-mesh`) for the LCP element.

### 4.3 Font loading

`GeistSans` and `GeistMono` are loaded via `geist/font` package. Both are inlined and use `font-display: swap` by default. No FOIT, but the variable font pulls a single binary per weight.

**Refinement:**

1. Confirm only one weight of `GeistMono` is used; otherwise subset.
2. Verify `font-feature-settings` (`globals.css:145-146`) is set on `body` — currently yes.

### 4.4 Motion budget

`prefers-reduced-motion` is honoured (`globals.css:373-381`). The hero uses `gradient-mesh` + 3D + `CountUp` + `Reveal`. `CountUp` on stats should be the first to be deleted (see §2.1.1).

---

## 5. Accessibility & i18n

### 5.1 Skip link

`components/layout/Header.tsx:55-60` ships a skip link to `#main`. Verify `#main` exists on every page (especially the layout root).

**Refinement:**

1. Confirm `<main id="main">` is set in `app/[locale]/layout.tsx` (not inspected here). If not, add it.
2. Add a `tabindex` reset on the skip destination.

### 5.2 Cart count live region

`Header.tsx:183-185` has `<span class="sr-only" aria-live="polite">` for the cart count. Good.

### 5.3 Image alts

`VialGraphic` is illustrative. `<VialGraphic ... showLabel={false} />` in `ProductCard.tsx:68` renders without a label. Verify it has an empty `aria-label` or `aria-hidden="true"` upstream — not inspected here.

### 5.4 Form labels

`NewsletterForm` is small but verify `placeholder` is not the only label (a11y anti-pattern).

### 5.5 i18n completeness

`PHASE1_INVENTORY.md §5` reports five locales at 790–800 lines each. The hard-coded English in `page.tsx` (§2.1.2) and the `Low · {n} left` interpolation (§2.1.7) are unfinished.

**Refinement:**

1. Add a CI check: for every translation key used by a client component, the key must exist in every locale file. (Plan §10.)
2. Add a runtime check in dev mode that warns when `useTranslations` falls back to English.
3. Localise the footer payment caption (`Stripe-secured`) and the top bar's badge copy.

### 5.6 Locale switcher

`LocaleSwitcher` (`components/layout/LocaleSwitcher.tsx`) is imported into the header. Verify it preserves the current pathname when switching languages (`hreflang` semantics).

---

## 6. Sequenced backlog with acceptance criteria

This backlog is sequenced for one experienced developer with design and content support. Estimated effort assumes the Phase 2 schema work (`purchaseMode`, typed units, `activeBatchId`, inventory reservations, documents pipeline) lands in parallel.

### Sprint 1 — Trust claims and navigation (3–5 days)

| ID | Task | Acceptance |
|---|---|---|
| UI-1 | Replace hero `CountUp` stats with evidence-safe copy | No `CountUp` on the homepage; copy is fixed-text and reviewable |
| UI-2 | Build `lib/claims/registry.ts` with claim-ID → evidence mapping | Render-time guard hides claims whose evidence is not verified |
| UI-3 | Reorder primary nav: Shop · Batch verification · Quality · Support · Company | Header `navItems` order matches; Mega Menu holds secondary links |
| UI-4 | Remove top-bar trust strip; fold its content into the footer | No "EU dispatched / HPLC verified / Free shipping" stack on small viewports |
| UI-5 | Trim footer payment icons to verified methods only | Only `stripe_card` + `coinbase_commerce` shown; no PayPal/ApplePay/GooglePay/Amex/SEPA mock |
| UI-6 | Drop subscription section from homepage | No "Lock in your batch" banner; `app/[locale]/page.tsx` no longer references `RefreshCw` or "subscribe" copy |
| UI-7 | Replace mock COA card with a real-batches reader | COA panel reads from `products.activeBatchId`; if no active batch, render an empty state |

### Sprint 2 — Performance and deployment hardening (3–5 days)

| ID | Task | Acceptance |
|---|---|---|
| PERF-1 | Convert 3D imports to `next/dynamic` with skeleton fallback | No `@react-three/fiber` in initial bundle; Lighthouse TBT < 200 ms on the homepage |
| PERF-2 | Per-route Lighthouse budget in `.lighthouserc.json` | CI fails if LCP/INP/CLS exceeds Plan §11 thresholds on `/en`, `/en/shop`, `/en/shop/<slug>` |
| PERF-3 | Fix bundle-size CI script to actually gzip the chunks | CI budget assertion correctly enforces 300 KB gzipped shared-chunk ceiling |
| DEP-1 | Add `scripts/check-env.ts` and run from `pnpm build` | Production build fails when `DATABASE_URL` / `AUTH_SECRET` / `AUTH_URL` are unset |
| DEP-2 | Update `README.md` to describe dual-target (Vercel canonical + Netlify preview) | No internal contradiction between `README.md`, `RUNBOOK.md`, `netlify.toml` |
| DEP-3 | Drop `sanity/` from runtime image | `Dockerfile` final stage has no `sanity/` COPY; image is smaller |

### Sprint 3 — Accessibility, i18n, motion (3–5 days)

| ID | Task | Acceptance |
|---|---|---|
| A11Y-1 | Confirm `<main id="main">` exists at the locale layout root | Skip link works; first Tab lands on the main landmark |
| A11Y-2 | Audit `<img>` / SVG `<VialGraphic>` for alt text | Every illustrative SVG has `role="img"` + `aria-label` or `aria-hidden` |
| A11Y-3 | Add CI lint for missing translation keys | CI fails when a key used in code is absent in any locale file |
| A11Y-4 | Hard-code English fallback warning in dev | Dev-mode warning when `useTranslations` returns the key instead of a translated string |
| I18N-1 | Locale-aware number/currency formatting | All stock counts and prices use `Intl.NumberFormat`; no doubled `%%` |
| I18N-2 | Localise all hard-coded strings on the homepage and footer | `pnpm check:i18n` passes |

### Sprint 4 — Plan §6 visual polish (4–7 days, after Sprint 1-3)

| ID | Task | Acceptance |
|---|---|---|
| VIS-1 | Adopt one typography scale, spacing system, button hierarchy | `globals.css` and components reference only the `@theme` tokens; no arbitrary font/spacing values in JSX |
| VIS-2 | Identify illustrative renders | 3D carousel and `VialGraphic` carry a visible "Illustrative" caption or alt text |
| VIS-3 | Sticky add-to-cart mirrors the main panel state | Sticky ATC uses the same `purchaseMode`/`isOut`/`isLow` data; CTA label matches |
| VIS-4 | Remove duplicate newsletter forms | Newsletter appears once (footer) |
| RES-5 | Footer has one copyright statement | No duplicate `©` lines; legal entity name from `getLegalIdentity()` |

### Sprint 5 — Verification (3–5 days)

| ID | Task | Acceptance |
|---|---|---|
| VER-1 | Cross-browser smoke (Chromium, WebKit, Firefox) via Playwright | All Playwright suites pass |
| VER-2 | Lighthouse report attached to the release tag | LHCI artefacts present in CI for the release commit |
| VER-3 | Manual a11y pass on home, shop, product detail, cart, checkout | axe-core smoke + manual screen-reader pass recorded |
| VER-4 | Restore-from-backup + rollback demonstration captured | `RUNBOOK.md §9` rollback procedure is followed and recorded; RTO/RPO noted |

---

## 7. Out of scope for this refinement plan

These belong to other workstreams (Workstream A, B, D, E, F, G in the Implementation Plan) and are not addressed here:

- Catalogue, units, purchase modes, batch data and documents repair (Phase 2 design already exists; implementation is in `PHASE2_CATALOGUE_DESIGN.md`).
- Eligibility matrix, claim-to-evidence register (Workstream A).
- Checkout, payments, fulfilment, portal (Workstreams D, E).
- Hosting/security (Workstream F) — except the deployment-posture notes in §3.
- Policies, localisation and editorial quality (Workstream G) — except the i18n items in §5.

---

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Removing the top-bar trust strip reduces conversion | Medium | Medium | A/B test against the current bar; replace with a single footer "Verified by" line |
| Removing subscription banner loses a featured CTA | Medium | Low | Defer per Plan §7; reintroduce in Sprint after inventory reservations ship |
| `next/dynamic` 3D switch breaks visual parity with the demo | Low | Medium | Use the existing `ProductCarousel` as the static fallback; ship both, route to 3D via `?view=3d` |
| `validateBuildEnv()` rejects preview deploys without full env | Medium | Medium | Allow `BUILD_MODE=demo` to skip the check; gate only on production builds |
| `bundle-size` rewrite tightens the threshold and breaks the build | Low | Low | Phase the rollout: warn first, fail after one week |

---

## 9. Done definition

The refinement plan is complete when:

1. Every `UI-*` / `PERF-*` / `DEP-*` / `A11Y-*` / `I18N-*` / `VIS-*` / `VER-*` task above has a green CI check or a recorded manual pass.
2. The CI `bundle-size` budget is enforced correctly (the script bug is fixed).
3. The homepage carries no `CountUp` on scientific measurements and no unverified trust claims.
4. The primary navigation matches Plan §6's order.
5. The 3D viewer loads only after interaction.
6. `README.md`, `RUNBOOK.md`, and `netlify.toml` agree on the canonical deploy target.
7. Lighthouse CI fails the build when Plan §11 budgets regress.

Once those hold, the frontend is ready for the controlled pilot described in `AverianLabs_Implementation_Plan.md §11`.