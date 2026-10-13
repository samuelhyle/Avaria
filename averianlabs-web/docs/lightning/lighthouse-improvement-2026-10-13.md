# Lighthouse Improvement — 13 October 2026

**Baseline:** `docs/lightning/lighthouse-baseline-2026-10-13.md`
**After:** this document, captured immediately after applying the IntersectionObserver + idle-callback deferral described in `components/three/LazyOnVisible.tsx`.

## What changed

`components/three/ThreeDShell` already wrapped both 3D scenes. The follow-up was the second-stage deferral:

- `components/three/LazyOnVisible.tsx` *(new)* — generic client component that renders a fallback until either (a) `IntersectionObserver` reports the element is near the viewport, or (b) `requestIdleCallback` fires after first paint.
- `components/three/LazyPeptideTorusHero.tsx` — was a `next/dynamic(...)` value; now a function component that wraps the dynamic chunk in `LazyOnVisible` with `rootMargin: 200px`.
- `components/three/LazyShop3DCarousel.tsx` — same treatment for the homepage shop carousel.

The chunk is no longer requested during the first React commit. The skeleton renders, then once the browser is idle (or the user scrolls toward the hero), the dynamic import fires and the 3D canvas mounts.

## Numbers — homepage cold load

| Metric | Before (14:21) | After (14:30) | Δ |
|---|---|---|---|
| Performance | 52 | **66** | **+14** |
| LCP | 1.9 s | **1.0 s** | **−0.9 s** |
| TBT | 7,350 ms | **3,280 ms** | **−4,070 ms (−55 %)** |
| Speed Index | 6.6 s | **1.7 s** | **−4.9 s (−74 %)** |
| CLS | 0 | 0.003 | +0.003 (negligible) |
| FCP | 0.3 s | 0.3 s | 0 |
| Best Practices | 95 | 95 | 0 |
| SEO | 100 | 100 | 0 |

The other audited routes are unchanged (they don't ship 3D content). TBT on the other routes stayed at 10 ms (warm) and 0–10 ms (cold).

## What this did not yet fix

TBT is still 3,280 ms on the homepage. That residual comes from the 3D canvas itself, which the IntersectionObserver or idle callback *does* eventually mount (Lighthouse triggers both), and mounting a 3D scene synchronously still costs ~3 s of main-thread time.

To get the homepage perf to ≥ 90:

1. **Defer past the Load event** — make the 3D mount happen via a `useEffect` that runs after `window.dispatchEvent("load")`, so Lighthouse's TBT measurement window (which closes at the Load event) does not capture the canvas mount. Trade-off: users with JS disabled see the skeleton forever.
2. **Extract 3D to a separate route group** — `app/(3d)/shop-3d/page.tsx` with a "View in 3D" link. The static `ProductCarousel` becomes the default. Static page bundle drops to ~600 kB (without three.js), homepage perf returns to 99.
3. **Self-host three.js as a single bundled chunk** — eliminate the drei / postprocessing fragmentation. The two top chunks at 687.6 kB and 480.8 kB (gzipped) would merge into one ~1 MB chunk that's loaded once and cached.

## Files

- `components/three/LazyOnVisible.tsx` *(new, 76 lines)*
- `components/three/LazyPeptideTorusHero.tsx` (rewritten)
- `components/three/LazyShop3DCarousel.tsx` (rewritten)
- New lhci reports at `.lighthouseci/baseline/` (overwrite of the previous run; the JSON files now reflect the post-deferral state)

## Recommended next action

Extract the 3D scenes to a separate route group (option 2). It is the largest single perf win and is a self-contained refactor:

- New `app/[locale]/shop-3d/page.tsx` that renders the carousel as the only content.
- New `Link` from the homepage "Shop" button to `/${locale}/shop-3d`.
- The static `ProductCarousel` becomes the default `/shop` page (it already exists in the bundle).

Expected: homepage perf ≥ 95, TBT ≤ 200 ms, total gzipped shared bundle ≤ 1.5 MB.
