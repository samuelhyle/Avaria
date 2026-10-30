# Shop rebuild — "more of a shop" roadmap

Date: 20 October 2026 · Status: Phase A–E shipped, F–L planned

This pass strengthens the storefront surface — product detail, cart, checkout, catalogue filters, drawer header — while preserving every Master Plan guardrail (source-backed copy, native review status, the established 3D, i18n parity, merchant preconditions). Build clean, prod server on `:3030`, 10/10 audited routes return 200, all five locales in parity.

## What's been shipped this pass

### Phase A — Product detail buy box (`components/product/ProductDetailActions.tsx`)
A 6-block store-style buy box replaces the original flat action panel:

1. **Pricing hero** — large tabular price + per-vial unit + VAT note + coloured stock indicator
2. **Variant selector** — chip grid with SKU, price-by-variant, "Currently unavailable" badge for stock-outs, and a selected-state check mark
3. **Quantity + ATC** — bigger increment/decrement, full-width "Add to cart" CTA with live total
4. **Wishlist · Compare · Save to plan** — labelled pill row (wishlist button now supports both icon-only and labelled modes)
5. **Trust strip** — three-tile band (Secure checkout / Batch-traceable / Free over €150 Finland delivery)
6. **Calculator shortcut + assigned batch card** — combines the existing functionality into a single card

Quotation-mode variants gracefully fall through to a `QuoteForm` inside the same shell.

### Phase B — Cart page (`components/cart/CartView.tsx`, `app/[locale]/checkout/cart/page.tsx`)
- New route-level eyebrow + heading + subtitle on the cart page
- Line-items table with thumbnail, name, SKU, unit price, qty stepper, line total, trash button
- Free-shipping progress with success/pending states
- Cart-aware "Explore more products" recommendation grid (skips items already in cart + reference products)
- Empty state with primary CTA + recommendation grid fallback
- Quick "Continue shopping" + "Remove all" links

### Phase C — Checkout polish (`app/[locale]/checkout/layout.tsx`)
- Eyebrow + display title on the checkout layout
- Trust band with three icons + labels (Secure checkout · Batch documents · Request a quote · Finland)
- The existing `CheckoutSteps` stepper is wrapped in a constrained container so it doesn't dominate the canvas
- All step routes benefit from the trust band automatically without per-route changes

### Phase D — Cart drawer mini-summary (`components/cart/CartDrawer.tsx`, `components/cart/CartMiniSummary.tsx`)
- New `CartMiniSummary` component — compact sticky footer at the bottom of the cart drawer with:
  - Subtotal (huge tabular number)
  - Free-shipping progress with success/pending states
  - Last 3 added items with thumbnail, name, SKU, qty, line total
  - Primary "Checkout" CTA
- Old in-drawer duplication of total + free-shipping block removed

### Phase E — Catalogue quick filters (`components/product/QuickFilters.tsx`, `components/shop/ShopCatalog.tsx`)
- New `QuickFilters` row renders above the existing `ShopToolbar`
- Three one-click pills: **In stock**, **Has documents**, **Quote-only** — mirrored to the same URL search params the sidebar uses, so toggling here and unchecking the sidebar stay in sync
- `aria-pressed` exposes the active state to assistive tech
- 3 new translation keys mirrored across EN, FI, DE, SV, NL

### Polish throughout
- `WishlistButton` now accepts labelled children so it can render both as an icon-only round button (existing usage) and as a wider pill (new usage in the buy box)
- `StockIndicator` is its own reusable surface component (`components/product/StockIndicator.tsx`) — three states (in stock, low stock, out of stock / quote-only), all colour-paired with icon + text
- `quotes` for clear inline stock messaging on the home page

## File map (added or rewritten)

| Path | Change |
| --- | --- |
| `app/[locale]/checkout/cart/page.tsx` | rewrite — eyebrow + heading + new cart layout |
| `app/[locale]/checkout/layout.tsx` | rewrite — eyebrow + trust band + constrained stepper |
| `components/product/ProductDetailActions.tsx` | rewrite — store-style 6-block buy box |
| `components/product/StockIndicator.tsx` | add — reusable 3-state indicator |
| `components/product/QuickFilters.tsx` | add — 3 one-click filter pills |
| `components/product/WishlistButton.tsx` | extend — accept labelled children |
| `components/cart/CartView.tsx` | rewrite — line-items + recommendations + empty state |
| `components/cart/CartMiniSummary.tsx` | add — drawer footer mini-summary |
| `components/cart/CartDrawer.tsx` | rewrite — uses CartMiniSummary |
| `components/shop/ShopCatalog.tsx` | extend — render `<QuickFilters>` above toolbar |
| `messages/{en,fi,de,sv,nl}.json` | +3 keys in `shop.*` |
| `docs/SHOP_REBUILD_2026-10-20.md` | this file |

## Validation

- `pnpm typecheck` — clean.
- `pnpm lint` (autofixed on touched files) — no new errors.
- `node scripts/check-i18n-keys.mjs --quiet` — `5 locales · 1429 leaf keys · 0 missing`.
- Production build (`npx next build`) — clean, no warnings on the touched routes.
- All 10 audited routes return HTTP 200 on `:3030` (production):
  - `/en`, `/fi`, `/en/quality`, `/en/about`, `/en/shop`, `/en/peptide-calculator`,
    `/en/documents`, `/en/shop/bac-water`, `/en/checkout/cart`, `/en/checkout/email`.

## Planned (next sprint)

- **F** — Compare drawer upgrade (real modal with side-by-side table, accessibility-tracked row headers, add-to-cart from the compare)
- **G** — Quick-view modal on catalogue cards (open product in a sheet without leaving the list)
- **H** — Recently-viewed backfill in the product page sidebar
- **I** — Mini-cart preview popover in the header (hover/focus on the cart icon, last 3 items, "review cart" CTA)
- **J** — Promo / coupon code input + applied coupon pill on the cart page
- **K** — Saved-for-later / saved carts (signed-in customers)
- **L** — Reorder one-click for returning customers, with explicit consent for the price-change notice

## What is intentionally **not** in scope

- Real merchant data — no saleable inventory was added. The 15 seeded SKUs are still drafts and render as "Currently unavailable / Request a quote"; the buy box routes through `QuoteForm` for those, exactly as before.
- New authentic photography or origin batch documents — still pending per Master Plan §7.
- Price / currency display expansion — Finland-only direct checkout is retained.
- Wholesale / B2B — `partner` route and `b2bToggle` exist already; the next sprint plans deeper UX work on the partner side.

## How to look at it locally

Site is live at **http://localhost:3030/en** with the rebuilt shop.

```bash
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  AUTH_URL=http://localhost:3030 AUTH_SECRET=local-demo \
  PORT=3030 npx next start -p 3030
```

Visual artefacts: `docs/demo-screenshots-2026-10-20/shop/` — 11 PNGs covering home, product detail, cart (empty + populated), drawer, and three checkout step screens.
