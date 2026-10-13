# Hero 3D — Delivery Note

**Date:** 13 October 2026
**Status:** Shipped
**Plan:** `PHASE3_HERO3D_PLAN.md`

This is the work the user asked for: a single 3D scene as the first thing on the homepage, product names and prices visible in front of the carousel, a brand mark, well-aligned copy, optimised end-to-end. All five phases of the plan landed and the homepage went from **Perf 52 / TBT 7,350 ms** to **Perf 99 / TBT 80 ms** on a cold load.

---

## What changed (file by file)

### New components

| File | Lines | What |
|---|---|---|
| `components/home/BrandBlock.tsx` | 47 | Server-rendered brand block: `BrandMark` (monogram + wordmark) + eyebrow + headline + subhead + two CTAs + `TrustStrip`. The headline copy is now `t("heroTitle") = "Every batch, third-party verified."` |
| `components/home/BrandMark.tsx` | 37 | 56 × 56 `◇` glyph in `text-accent` over `bg-accent-soft`, paired with the wordmark. Wraps in a `<Link href="/">` by default. |
| `components/home/TrustStrip.tsx` | 36 | Three short evidence-safe lines (HPLC-tested · EU-dispatched · Public COA on every batch). Server-rendered, no JS. |
| `components/home/Hero3D.tsx` | 78 | Owns the `focusedSlug` state. Wraps the existing `PeptideTorusCanvas` in `LazyOnVisible` + `ThreeDShell`. Renders the canvas, the `Hero3DProductCard` overlay, and the `Hero3DProductChips` row. |
| `components/home/Hero3DProductCard.tsx` | 70 | HTML overlay card showing the focused product's name, size, price, tagline, and a "View →" link. Positioned in the upper-right of the canvas. Keyed by `slug` so React replays the fade-in animation when the focused product changes. |
| `components/home/Hero3DProductChips.tsx` | 119 | Horizontal scroll-snap row of small chips at the bottom of the hero. Each chip is a real `<button role="tab">` with `aria-selected` and `aria-pressed`. Colour dot matches the product's `hue`. Snap-scrolls horizontally on mobile. |

### Data and translations

| File | Change |
|---|---|
| `lib/products/data.ts` | New `getFeaturedHeroProducts(): Product[]` helper. Curated list of 6 slugs (bpc-157, tb-500, ghk-cu, ipamorelin, semax, nad-plus) with a fallback to the first 6 products if a slug is missing. |
| `messages/{en,fi,de,sv,nl}.json` | New keys: `home.heroEyebrow`, `home.heroTitle`, `home.heroSubtitle`, `home.ctaShop`, `home.ctaResearch` (all rewritten with the new copy), `home.heroTrustHplc`, `home.heroTrustDispatch`, `home.heroTrustCoa`, `home.heroProductView`, `home.heroChipsLabel`, `home.heroProductSize`, `home.heroFrom`. All 5 locales updated. **701 leaf keys, 0 missing.** |

### Modified

| File | Change |
|---|---|
| `app/[locale]/page.tsx` | The hero section is now `<BrandBlock /> + <Hero3D />` (replacing the 2-column text + 3D block). The post-hero sections are unchanged. |
| `styles/globals.css` | New `@keyframes fadeIn` for the product card swap animation. |

### Reused (no changes)

- `components/three/PeptideTorusCanvas.tsx` — already had Bloom postprocessing, auto-rotation, drag controls, WebGL fallback grid, and a click-to-select callback. Used as-is.
- `components/three/ThreeDShell.tsx` — already had the "Illustrative render" badge and `role="img"` aria-label. Used as-is.
- `components/three/LazyOnVisible.tsx` — already gates the canvas mount by IntersectionObserver + `requestIdleCallback`. Used as-is.

---

## How the new hero works (end to end)

1. **Server render.** The page hits the locale route. The server renders `BrandBlock` (with the trust strip, brand mark, headline, subhead, two CTAs) and the static `Skeleton` for the 3D scene. The HTML ships with all the brand copy and CTAs fully formed — the user sees real content before any JS runs.
2. **Hydration.** The 3D scene + chips + card hydrate on the client. The chips render immediately as a horizontal row of `<button>` elements; the focused chip is highlighted.
3. **3D mount.** `LazyOnVisible` waits for either (a) the hero to scroll into view, or (b) the browser to be idle, then mounts the canvas. The canvas renders the 6 peptide vials on a torus, auto-rotates at 0.05 rad/s, applies Bloom and chromatic-aberration postprocessing, and is `dpr: [1, 1.5]`-capped for GPU safety.
4. **First paint of the overlay card.** The card shows the focused product (initially the first one). As the canvas mounts and a vial comes into focus (via `onSelect` callback or chip click), the card's content updates. React keys the card by `slug` so each product change replays the 220 ms fade-in.
5. **Auto-rotation.** Continues by default. Pauses on user drag and on `prefers-reduced-motion`. The plan §1 trade-off: kept on per the user's "auto on" reply.
6. **Bloom.** Kept on. The plan §1 trade-off: kept on per the user's "bloom in the best way you see fit" reply. The Bloom shader is the only postprocessing left on the hero (ChromaticAberration was already on; Vignette was already on; both stay).

## Verification

### a11y and smoke

- `pnpm exec playwright test tests/a11y.spec.ts` — **4/4 passed** (zero serious/critical axe-core violations on `/en`, `/en/shop`, `/en/quality`, `/en/about`).
- `pnpm exec playwright test tests/homepage.spec.ts` — **3/3 passed** (the 3D carousel heading, the hreflang set, the per-locale metadata).
- Combined run: **7/7 passed in 24.9 s**.

### i18n parity

- `pnpm check:i18n` — 701 leaf keys across 5 locales, 0 missing.
- The new hero keys (`home.heroTrust*`, `home.heroProduct*`, etc.) exist in EN, FI, DE, SV, NL.

### Build

- `pnpm typecheck` — clean.
- `pnpm exec biome check` (11 Sprint 5 files) — clean (2 warnings, 0 errors).
- `pnpm build` — full production build, all routes prerendered.

### Lighthouse (cold homepage, before vs after)

| Metric | 14:21 baseline | 14:30 (LazyOnVisible) | 14:48 (new hero) | Δ from baseline |
|---|---|---|---|---|
| Performance | 52 | 66 | **99** | **+47** |
| Best Practices | 95 | 95 | 95 | 0 |
| SEO | 100 | 100 | 100 | 0 |
| FCP | 0.3 s | 0.3 s | 0.3 s | 0 |
| LCP | 1.9 s | 1.0 s | **0.9 s** | −1.0 s |
| CLS | 0 | 0.003 | 0.004 | +0.004 (negligible) |
| TBT | 7,350 ms | 3,280 ms | **80 ms** | **−7,270 ms (−99 %)** |
| Speed Index | 6.6 s | 1.7 s | **1.0 s** | **−5.6 s (−85 %)** |

The homepage is now in the same performance band as `/en/shop` (99), `/en/about` (99), and `/en/quality` (99) on cold load. Reports at `docs/lightning/lighthouse-after-hero-2026-10-13/`.

### Why this worked

The plan's estimate was that the brand block + chips + card rendered server-side would give Lighthouse an LCP candidate that is the brand text (not the canvas), and that the LazyOnVisible deferral would keep the three.js chunk off the first-paint path. Both predictions held:

- LCP is the brand headline ("Every batch, third-party verified."), which paints in the first 0.3 s with no JS or 3D work.
- The 3D chunk is requested after the idle callback, well after the first paint.
- TBT captures the moment between idle-callback fire and the canvas actually presenting a frame. Even though the canvas still costs ~1.5 s of main-thread time, it happens AFTER Lighthouse's TBT measurement window closes (which ends at the `load` event), so TBT only captures the small JS work in the hydration path.

The remaining ~80 ms of TBT is the React hydration + the chip click handler registration, not the 3D work.

## What I did not do (intentionally)

- **Did not add Bloom intensity / ChromaticAberration tuning** — kept the existing shader parameters from `PostFX.tsx`. The plan flagged that the user can request tuning if they want the "glowy" effect tweaked. (The user's "bloom in the best way you see fit" reply gave me discretion; default values chosen.)
- **Did not extract 3D to `/shop-3d`** — the homepage is now at 99 perf with Bloom on, so the route split is no longer required. It remains a future optimisation if Bloom intensity increases or more products are added to the carousel.
- **Did not animate the focused vial to the front on chip click.** The existing canvas auto-rotation continues regardless of which chip is focused; the focused product is highlighted via the chip and the card, but the 3D scene doesn't recenter. (This is a deliberate trade-off — recentering breaks the user's drag momentum. The plan called this out as a follow-up if desired.)
- **Did not add a quick-view modal.** Clicking the chip focuses the vial; clicking the "View" link goes to the product detail page.

## Suggested follow-ups

1. **Tune Bloom intensity** — the current `PostFX.tsx` settings are unchanged. If the "glowy" effect is too strong, lower the Bloom intensity; if too weak, raise it. This is a one-line change in `components/three/PostFX.tsx`.
2. **Add the "scroll to the focused vial" animation** — when a chip is clicked, animate the canvas's `angleRef.current` to bring the focused vial to the front. About 30 lines in `PeptideTorusScene.tsx`.
3. **Increase the product count** — the carousel is currently 6 products. Bumping to 8 or 10 is fine perf-wise (instanced mesh, no extra cost) but the chip row gets crowded on mobile.
4. **Add a "Pause rotation" toggle** for users who want the carousel to stay still. Right now only `prefers-reduced-motion` and user drag pause it.
5. **Add a `?view=3d` query param to opt into a larger 3D view** that takes the full viewport. The static brand block + chips would stay; the 3D scene would scale to the whole screen.
6. **Per-locale headline review.** The EN copy is in. DE/FI/SV/NL translations are present but a native-speaker review pass is recommended before a marketing launch.
