# Hero 3D Re-design — Plan

**Date:** 13 October 2026
**Status:** Plan awaiting approval
**Scope:** Homepage hero rebuild. One 3D scene as the page's first thing, product names + prices integrated, brand block aligned to it, perf kept within Plan §11 budgets.

---

## 1. What "good" looks like

The hero should feel like a research-grade product page (Apple/Bruker/Patagonia-class) — confident copy on the left, a single 3D scene on the right showing the actual peptide vials, with each vial labelled (name, size, price) as it comes into focus. No carousel arrows, no decorative flourishes, no fake stats. The page is honest about what it sells and the verification trail behind every vial.

**Reference frames:**
- Apple's `iPhone 15 Pro` product page (3D model, scroll-driven, no chrome).
- Bruker's `AVANCE NEO` NMR (clean technical photography with terse copy).
- Patagonia's `Worn Wear` (single hero image, three short lines, no claims).

The repo already has `components/three/PeptideTorusHero.tsx` and `components/three/Shop3DCarousel.tsx`. Both render `@react-three/fiber` scenes of instanced vials. Neither currently exposes per-product selection state to the DOM, and neither surfaces a name/price card for the focused vial. **That gap is the work.**

## 2. Proposed layout (desktop, ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [AverianLabs · monogram + wordmark]    [Shop · Lab · Quality · ...] [⌕][⚙][👤][♡][⚖][🛒]  │  ← Header
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────┐   ┌──────────────────────────────────┐│
│  │  ── research peptides         │   │                                  ││
│  │  ── precision · transparency  │   │                                  ││
│  │                               │   │                                  ││
│  │  Every batch,                 │   │     ░░  3D peptide carousel  ░░  ││
│  │  third-party verified.        │   │     ░░  auto-rotates slowly   ░░  ││
│  │                               │   │     ░░  drag to explore       ░░  ││
│  │  [Browse the catalogue →]     │   │     ░░  vials float & orbit   ░░  ││
│  │  [Verify a batch]             │   │     ░░  ◇ illustrative        ░░  ││
│  │                               │   │                                  ││
│  │  ─ HPLC-tested · EU-dispatched│   │   ┌─────────────────────────────┐││
│  │  ─ Public COA on every batch  │   │   │ BPC-157  ·  10 mg vial      │││
│  │  ─ 30-day money-back          │   │   │ €48  ·  ⓘ View →            │││
│  │                               │   │   └─────────────────────────────┘││
│  │                               │   │      ↑ this card anchors to the  ││
│  │                               │   │        vial currently in focus.  ││
│  └───────────────────────────────┘   └──────────────────────────────────┘│
│                                                                          │
│  [BPC-157]  [TB-500]  [GHK-Cu]  [Ipamorelin]  [Semax]  ←  product chips  │
│  ↑ these are the "next up" indicators, clickable to jump to each vial.   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Mobile (≤ 768 px):** the 3D scene collapses to a 60 vh block under the brand copy. The product card stacks below the scene, not anchored to a vial (the user's tap target has to be a 2D region on mobile). The product chips become a horizontal scroll strip.

## 3. Components to build or change

| Component | Status | What it does |
|---|---|---|
| `components/three/Hero3D.tsx` | **new** | Hosts the `@react-three/fiber` canvas, manages `focusedIndex` state, exposes a `useHeroProducts()` hook to its parent. |
| `components/three/Hero3DProductCard.tsx` | **new** | HTML overlay (NOT in-canvas 3D text). Renders the focused vial's name, size, price, and a "View" link. Positioned via CSS `transform: translate3d(...)` calculated from the vial's projected screen position. Re-evaluated on each frame. |
| `components/three/Hero3DProductChips.tsx` | **new** | A row of small chips at the bottom of the hero. Each chip is one of the featured products; clicking it animates the carousel to that vial. Keyboard-navigable. |
| `components/home/Hero3DShell.tsx` | **new** | Server component that owns the hero section. Composes `BrandBlock` + `Hero3D` (lazy) + `Hero3DProductChips`. Loads product data on the server so the chips and the first product card can render before the canvas hydrates. |
| `components/home/BrandBlock.tsx` | **new** | The wordmark + monogram + eyebrow + headline + subhead + CTA buttons + trust strip. Server-rendered, no JS. |
| `components/home/TrustStrip.tsx` | **new** | Three short statements (HPLC-tested · EU-dispatched · Public COA). Pulls copy from the new `home.trustStrip.*` translation keys. |
| `app/[locale]/page.tsx` | edit | Replace the current hero (text left, torus right) with `<Hero3DShell />`. Keep the rest of the page sequence from Sprint 1 (lab transparency, featured products, calculator CTA, lab batch card). |
| `lib/products/data.ts` | edit | Add a small helper `getFeaturedHeroProducts(): Product[]` that returns the same 6 products the chips show, in display order. |
| `messages/{en,fi,de,sv,nl}.json` | edit | Add `home.hero.*` keys (eyebrow, headline, sub, two CTAs, three trust-strip lines, "View" CTA) and the placeholder text for the loading state. |
| `styles/globals.css` | edit | Add `.hero3d-canvas`, `.hero3d-card`, `.hero3d-chip` utility classes that hold the design-token references in one place. |

## 4. Brand block — typography and color

The brand block uses the existing display-scale tokens (`font-display text-display-md` on the headline, `text-display-sm` on the secondary line). No new tokens.

| Element | Token | Notes |
|---|---|---|
| Eyebrow | `font-mono text-3xs uppercase tracking-[0.2em] text-accent-ink` | "Research peptides" or "Third-party tested" — same style as the existing COA panel eyebrow. |
| Headline | `font-display text-display-md font-semibold tracking-tight text-ink` | Two lines max. EN example: "Every batch, third-party verified." DE/FI/SE/NL each translated. |
| Subhead | `text-base text-ink-muted max-w-prose` | One line, no exclamation marks. |
| CTA primary | `<Button size="lg">Browse the catalogue →</Button>` | Existing component. |
| CTA secondary | `<Button size="lg" variant="outline">Verify a batch</Button>` | Existing component. |
| Trust strip | `text-sm text-ink-muted` three `flex items-center gap-2` rows | Glyphs from `lucide-react`: `FlaskConical`, `Truck`, `FileCheck2`. |

The **AverianLabs monogram** lives in the top-left of the brand block (above the eyebrow). It is a 56 × 56 px block containing:
- A flat `◇` glyph rendered in `text-accent` over `bg-accent-soft` (matches the existing "illustrative render" badge in `ThreeDShell`).
- Beside it, the wordmark "AverianLabs" in `font-display text-lg font-semibold tracking-tight`.

This gives the page a clear logo presence without requiring new SVGs.

## 5. Performance budget

The 2026-10-13 baseline (after the LazyOnVisible deferral) measured the homepage cold-load at **66 perf, 3,280 ms TBT**. The hero rebuild has to either:

- **(A) Hold the line** — keep homepage perf ≥ 66 and TBT ≤ 3,500 ms after the rebuild, OR
- **(B) Improve** — push homepage perf ≥ 80 and TBT ≤ 1,500 ms by extracting the heavy canvas to `/shop-3d` (the option-2 route split).

The work I propose is **scope (A) — hold the line**. The route split is a separate task; this plan does not block on it.

Specific knobs to keep TBT in check:

| Lever | Value | Why |
|---|---|---|
| `Canvas dpr` | `[1, 1.5]` (capped) | Prevents 2× retina rendering from doubling GPU work. |
| `Canvas frameloop` | `"demand"` once the focused product is steady, `"always"` while dragging | The default `"always"` runs the render loop at 60 fps forever. With `demand`, R3F only re-renders when a state change occurs. |
| `Canvas shadows` | disabled on the hero | Shadow maps are the single largest 3D cost. The hero doesn't need them. |
| Postprocessing | Bloom + ChromaticAberration removed on the hero | Both are `O(resolution)` shaders. The hero reads cleaner without them; the products stay legible. |
| drei imports | drop `Environment`, `ContactShadows`, `OrbitControls` from the hero canvas | These pull the bulk of the bundle. The hero uses its own minimal camera + a custom drag handler. |
| Instanced mesh | one `InstancedMesh` per (vial, batch) pair, capped at 6 | Already in place; just cap the product count. |
| Initial render | first frame: 6 vials, no rotation, no transparency | The auto-rotation animation kicks in via `useEffect` after first paint, so the first frame is cheap. |
| HTML overlay | rendered on `requestAnimationFrame` throttled to 30 fps | The card position updates 30× per second, not 60×. |

If we hit the budget with margin, we can re-enable Bloom or a soft shadow in a follow-up.

## 6. Animation / motion

- **Auto-rotation:** the carousel auto-rotates at 0.05 rad/sec when idle (no drag, no hover, no focused chip click in the last 4 s). Pauses on `prefers-reduced-motion`.
- **Focus transition:** when the user clicks a chip, the carousel animates the focused vial to the front (lerp `rotation.y` over 600 ms with `ease-in-out`).
- **Card fade-in:** the HTML product card fades opacity 0 → 1 over 200 ms when the focused index changes; fades back to 0.7 (not fully) when the user hovers off, so the user knows it is still active.
- **Canvas breathing:** a 0.5 % scale modulation on the whole group at 0.2 Hz (very slow, very subtle). Disabled on `prefers-reduced-motion`.
- **Chip click feedback:** scale 1 → 0.95 → 1 over 120 ms, no overshoot.

All of the above uses CSS `transform` + `opacity` only (compositor-only, no layout or paint cost).

## 7. Accessibility

- The canvas is `role="img"` with an `aria-label` from the existing `a11y.illustrative3D` key.
- Each product chip is a real `<button type="button">` with `aria-label="Focus BPC-157"` etc.
- Arrow keys (`←` `→` when the hero has focus) rotate the carousel.
- The HTML product card is keyboard-focusable. `Tab` enters the card; `Enter` activates the "View" link.
- `prefers-reduced-motion`: turn off auto-rotation, breathing, and chip scale; the carousel still responds to clicks and arrow keys.
- A "Skip 3D scene" link is the first element inside `<main>` for screen-reader users who want to bypass the carousel and go straight to the catalogue.

## 8. Phasing

| Phase | What | Acceptance |
|---|---|---|
| **1. Skeleton + brand block** | Brand block + product chips (no 3D yet) render server-side. The hero shows the chips, the headline, and a static product card. The 3D scene is a Skeleton in the right column. | Homepage perf ≥ 90 (because the heavy 3D is still gated by `LazyOnVisible`). The chips are tab-focusable. |
| **2. Wire `Hero3D` canvas** | Add the canvas behind the Skeleton. The carousel auto-rotates and the focused-vial state is exposed. | Canvas mounts only after the idle callback or intersection. TBT stays ≤ 3,500 ms. |
| **3. HTML overlay card** | Position the product card via `requestAnimationFrame`. Card content reflects the focused index. | Card is screen-reader-readable; first paint of the card happens after the canvas reports the first focused-vial projection. |
| **4. Polish** | Add the breathing animation, the chip click feedback, the focus-visible styles, and the `prefers-reduced-motion` cutoffs. | Manual pass on a real device. |
| **5. Verification** | Re-run the Lighthouse baseline + axe-core smoke. Compare against the 2026-10-13 baseline. | Perf ≥ 66 (held), TBT ≤ 3,500 ms, axe-core 0 serious/critical on `/en`. |

## 9. Trade-offs you should sign off on

1. **Auto-rotation by default** — gives the hero life but some users find it distracting. The chips + arrow keys + `prefers-reduced-motion` cover the alternative-access cases. If you'd rather it static, the only change is removing the `useFrame` that advances the rotation.
2. **No Bloom on the hero** — the products look slightly less "glowy" but the file size and TBT both drop. The current `PeptideTorusHero` has Bloom enabled.
3. **6 product chips at the bottom** — could be 4 (less crowded) or 8 (more choice). I default to 6 because the catalogue is small and the chips are a navigation aid, not a full listing.
4. **HTML overlay card instead of in-canvas 3D text** — this is the right call for accessibility and sharpness, but it does mean the card lives in 2D screen-space, not glued to the vial. As the carousel rotates, the card position is recomputed every frame from the vial's projected position. The visual effect is "the card floats next to the vial" — close, but not pixel-perfectly attached at all camera angles. If you want it pixel-perfect, we have to render it in-canvas (with the accessibility / sharpness trade-off).
5. **No quick-view modal** — clicking a chip focuses the vial, clicking the "View" link goes to the product page. A quick-view modal is a follow-up.

## 10. What I will not do in this scope

- No catalogue-page changes.
- No new product data fields (we use the existing 6 featured products).
- No Sanity content changes (the hero copy is in `messages/*.json`, not CMS).
- No route split (the `/shop-3d` extraction is a follow-up to keep perf in budget long-term).

## 11. What I'll deliver

- `Hero3DShell`, `BrandBlock`, `Hero3D`, `Hero3DProductCard`, `Hero3DProductChips`, `TrustStrip` components.
- Updated homepage using `Hero3DShell`.
- Updated `messages/*.json` with the new keys in all 5 locales.
- Updated `globals.css` with the new utility classes.
- Re-run Lighthouse baseline + axe-core smoke before/after.
- `PHASE3_HERO3D_DELIVERY.md` recording the build, the measured numbers, and the before/after diff.

## 12. Open questions for you

1. The 6 products on the hero — should they be the 6 currently featured, or a different 6? (My default: keep the current featured set.)
2. The headline copy — I'll write the EN version. DE/FI/SV/NL you'll want to review before merge; I can ship machine-quality translations but a native speaker should sign off.
3. Auto-rotation on/off? (My default: on, slow, pauses on interaction and on `prefers-reduced-motion`.)
4. Bloom on/off? (My default: off, to stay within the perf budget.)
5. Number of product chips? (My default: 6, same as the featured set.)
