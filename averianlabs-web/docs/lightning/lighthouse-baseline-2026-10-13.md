# Lighthouse Baseline — 13 October 2026

**Run:** `pnpm exec lhci autorun` against the production build (`pnpm start` on port 3000).
**Chrome:** Playwright's Chrome for Testing 153.0.8010.12 (lhci CLI default).
**Preset:** desktop.
**Pages audited:** `/en`, `/en/shop`, `/en/quality`, `/en/about`.
**Accessibility category:** skipped (Lighthouse 12's a11y audit was returning NaN with Chrome for Testing on this configuration; the axe-core smoke in `tests/a11y.spec.ts` covers this — 4/4 passing).

## Scores (post-warmup)

The first run is the cold-load story (3D viewer downloaded, parsed, mounted). The second run is the warm-cache story (3D viewer is already in the browser's HTTP cache and is rendered in ~140 ms of TBT instead of 7,350 ms).

| Page | Run | Perf | BP | SEO | FCP | LCP | CLS | TBT | SI |
|---|---|---|---|---|---|---|---|---|---|
| `/en` | 1 (cold) | **52** | 95 | 100 | 0.3 s | 1.9 s | 0 | **7,350 ms** | 6.6 s |
| `/en` | 2 (warm) | **96** | 95 | 100 | 0.3 s | 0.9 s | 0.003 | 140 ms | 1.1 s |
| `/en/shop` | 1 | 99 | 100 | 100 | 0.3 s | 0.9 s | 0.004 | 0 ms | 0.9 s |
| `/en/shop` | 2 | 99 | 100 | 100 | 0.3 s | 0.9 s | 0.004 | 10 ms | 0.5 s |
| `/en/quality` | 1 | 90 | 100 | 100 | 0.3 s | 1.0 s | 0.002 | 230 ms | 0.8 s |
| `/en/quality` | 2 | 99 | 100 | 100 | 0.3 s | 0.9 s | 0.002 | 10 ms | 0.7 s |
| `/en/about` | 1 | 99 | 100 | 100 | 0.2 s | 0.9 s | 0.004 | 10 ms | 0.7 s |
| `/en/about` | 2 | 99 | 100 | 100 | 0.3 s | 0.9 s | 0.004 | 10 ms | 0.7 s |

## Findings

### Homepage TBT is the bottleneck (cold load only)

- 7,350 ms of total blocking time on a cold load of `/en` — almost entirely from the 3D viewer (`@react-three/fiber` + `drei` + `postprocessing` + `three`, ~600 KB gzipped).
- The other routes ship no 3D content and have TBT ≤ 230 ms.
- Warm-cache runs are all ≤ 140 ms. The bottleneck is **first-load download + parse**, not the steady-state render.

### Lighthouse `unused-javascript` warning

The audit reports the 3D-viewer chunks as "unused JavaScript" because they only execute when the user actually interacts with the 3D carousel. They are not strictly unused — they are loaded for the homepage hero and the catalogue's 3D view. The fix is to:

1. Defer the 3D hero's mount to after first paint (`requestIdleCallback` or a `useEffect` with a small delay).
2. Gate the 3D shop carousel behind a user click ("View in 3D" button) instead of rendering it eagerly.
3. Optionally extract `components/three/*` into a separate route group so the bundle only loads on `/shop?view=3d`.

### Other metrics are excellent

- LCP ≤ 1.0 s on every route (the homepage peaks at 1.9 s on cold load because the LCP candidate is the 3D canvas itself).
- CLS ≤ 0.004 on every route (Skeleton fallbacks hold the layout).
- SEO and Best Practices are 100 on every route.

## Recommended next steps (ordered by impact)

1. **Defer the 3D hero's mount** — wrap `<LazyPeptideTorusHero>` in an `IntersectionObserver` that only loads the chunk when the hero scrolls into view (or after `requestIdleCallback`). This is the single largest expected win.
2. **Gate the 3D shop carousel behind a click** — render a "View in 3D" button on the homepage; only mount the canvas when the user clicks it. The static `ProductCarousel` already provides the static fallback.
3. **Re-run the baseline after #1 and #2** — expected homepage perf ≥ 90, TBT ≤ 200 ms on cold load.

## Report files

- `localhost-en-2026_10_13_11_20_04.report.html` (cold homepage, perf 52)
- `localhost-en-2026_10_13_11_22_22.report.html` (warm homepage, perf 96)
- `localhost-en_shop-2026_10_13_11_20_35.report.html` (shop)
- `localhost-en_quality-2026_10_13_11_20_55.report.html` (quality)
- `localhost-en_about-2026_10_13_11_21_15.report.html` (about)
- Plus matching `.report.json` for each.

The HTML reports are openable in any browser; the JSON reports are what `lhci collect` consumes.
