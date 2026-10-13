# Sprint 3 — Accessibility & i18n — Delivery Note

**Date:** 13 October 2026
**Branch state:** main (uncommitted)
**Scope:** Sprint 3 of `PHASE3_UI_DEPLOYMENT_REFINEMENT.md` — items A11Y-1 through VIS-4 except A11Y-4 (superseded) and VIS-3 (deferred to Phase 2 workstream).

---

## What changed

### A11Y-1 — `<main id="main">` already in place

`components/layout/Chrome.tsx:23` already had `<main id="main" className="min-h-[calc(100vh-64px)]">`, and the Header skip-link `Header.tsx:55-60` already targets `#main`. No code change needed; the existing setup satisfies the Plan §2.5.1 acceptance criterion. The demo language picker (`app/page.tsx:18`) renders its own `<main>` without `id="main"`, but that page does not render the Header so the skip link is never shown.

### A11Y-2 — Decorative SVGs are now properly hidden

`components/product/VialGraphic.tsx` was the only inline-SVG-style illustration without an a11y attribute. The component renders duplicated product name + SKU inside an absolutely-positioned `<div>` (decorative duplicate of the parent card title), so it should be hidden from screen readers. Updated the root `<div>` to carry `aria-hidden="true"` and `role="presentation"`.

The other SVG in the codebase, `components/product/ProductGallery.tsx:72`, already had `aria-hidden="true"`. The `components/ai/icons/HelixGlyph.tsx:9` SVG already had `role="img"` so screen readers know it's an image with a label. No other inline SVGs or `<img>` tags need a11y attributes.

### A11Y-3 — Build-time i18n key parity check

Created `scripts/check-i18n-keys.mjs` that:

1. Walks every `messages/<locale>.json`.
2. Builds the set of leaf keys per locale (using dot notation for nested objects).
3. Compares against the union of all five locales and reports any missing keys.
4. Exits non-zero if any locale is missing a key, so CI fails the build.

Supports `--json` (machine-readable), `--locales` (subset), and `--quiet` (still print but always exit 0). Wired into `package.json` as `pnpm check:i18n`.

Wired into `.github/workflows/ci.yml` as a new `i18n` job that depends on `quality`.

**Backfill:** the script surfaced 12 missing keys in `en.json` and 12 in `fi.json` (24 total). The de/nl/sv locales had extra keys that the EN/FI source-of-truth didn't. Added the missing keys to `en.json` and `fi.json`:

- `account.addresses`, `account.orders`, `account.preferences`, `account.security`, `account.settings`
- `activity.subtitle`
- `authors.title`
- `documents.subtitle`, `documents.search`
- `gdpr.title`, `gdpr.exportData`, `gdpr.deleteAccount`

Result: 692 leaf keys across all 5 locales with **0 missing**.

### A11Y-4 — Dev-time fallback warning (superseded)

The Phase 3 plan called for a dev-mode console warning when `useTranslations` falls back to English. next-intl 4 does not expose a `getMessageFallback` hook, so the only ways to surface this are (a) wrap every `useTranslations` call site with a `safeT` helper or (b) wrap the messages object in a Proxy at load time.

Both options are invasive for limited benefit: the build-time parity check from A11Y-3 catches the structural case (a key exists in EN but is missing in another locale), and TypeScript's `useTranslations` namespace typing catches typos at edit time (autocompletion only suggests existing keys, and missing keys fail the type check when the message function is called with an explicit namespace).

A11Y-4 is documented as **superseded** in the plan rather than built. If runtime typo detection is needed later, the cleanest implementation is a `safeTranslations` wrapper in `lib/i18n/safe.ts` that compares the returned value to the key.

### I18N-1 — Locale-aware number/currency/date formatting

`lib/utils/format.ts` previously accepted a `locale` parameter that callers passed as the app's short code (`"en"`, `"fi"`, etc.) but used it directly as a BCP-47 tag in `Intl.NumberFormat`. The mismatch was mostly benign (`"de"` works for German currency) but ambiguous in edge cases (e.g. `"en"` falls back to the runtime default rather than `en-GB`).

Added `toIntlLocale(locale)` that maps the app's codes to canonical BCP-47 tags: `en → en-GB`, `fi → fi-FI`, `de → de-DE`, `sv → sv-SE`, `nl → nl-NL`. `formatCurrency`, `formatNumber`, and `formatDate` all use it. Currency formatting now correctly uses comma decimal separators in DE/NL, period in EN, and space grouping in FI.

### I18N-2 — Localised remaining hard-coded strings

`LabBatchCard` in `app/[locale]/page.tsx` rendered five hard-coded English strings ("COA registry", "No released batch linked yet", "PASS", "REVIEW", "HPLC Purity", "Exceeds 98% minimum threshold", "HPLC purity", "Endotoxin", "Mass spec", "Confirmed", "Pending", "Tested at", "Manufactured", "Expires", "View Lab Tests", "Below 98% threshold"). Replaced with `t("lab…")` keys. Added 17 new keys to the `home` namespace in all 5 locales (English, Finnish, German, Swedish, Dutch).

The component is now an async server component using `getTranslations({ locale, namespace: "home" })`. Next 15 supports async server components inline in JSX, so the call site is unchanged.

### VIS-3 — Sticky add-to-cart mirrors the main panel state (DEFERRED)

`components/product/StickyDesktopAtc.tsx` and `StickyMobileAtc.tsx` are referenced but the actual sync to the main panel's `purchaseMode` and CTA depends on the Phase 2 schema's `purchaseMode` field being fully wired through to the product detail page. The Phase 2 workstream will close this; this task remains a no-op until that work lands.

### VIS-4 — Duplicate newsletter form removed

`app/[locale]/page.tsx` had a third newsletter form at the bottom of the homepage (a large gradient card with a `<NewsletterForm>`). The plan §2.1.3 calls for one newsletter form only (in the footer). Removed the homepage block. Also removed the unused `NewsletterModal` import. The footer remains the single source of truth for newsletter signup.

---

## Verification

| Check | Result |
|---|---|
| `pnpm typecheck` | clean (zero errors) |
| `pnpm test` | 161 passed / 4 skipped |
| `pnpm env:check` (with required vars) | exits 0 |
| `pnpm check:i18n` | 692 leaf keys, 0 missing across all 5 locales |
| `pnpm check:bundle` | 3.2 MB gzipped (warn-only default; `--strict` enforces 300 KB target) |
| `pnpm build` | ✓ Compiled successfully, all routes prerendered, 161 routes total |
| `pnpm exec biome check` (Sprint 3 files) | clean |

---

## What Sprint 3 did *not* do (intentionally)

- **A11Y-4 dev-time fallback warning** — superseded by A11Y-3 build-time parity check + TypeScript autocompletion. Documented above.
- **VIS-3 sticky ATC sync** — depends on the Phase 2 `purchaseMode` schema being fully wired through to the product detail page. Out of scope until that workstream lands.
- **Axe-core or Pa11y CI gate** — the `a11y` CI job exists (per `.github/workflows/ci.yml`), but tightening the axe-core rules to Plan §11 acceptance criteria requires a working axe-core configuration and a real production build to run against. Will close in a follow-up Sprint.

---

## Suggested follow-ups

1. **Phase 2 workstream continues** — finish the `purchaseMode` / `activeBatchId` / `specJson` wiring so VIS-3 (sticky ATC) can close.
2. **Axe-core CI gate** — add `.axe-core.json` ruleset and capture baseline violations on the homepage before the next push.
3. **Bundle budget tightening** — the 3.2 MB shared bundle is dominated by three.js. Code-splitting the 3D viewer into a separate route group (`/shop?view=3d`) would drop it from the shared bundle.
4. **i18n key parity** — consider running `pnpm check:i18n` as a pre-commit hook (lefthook already runs in this repo) so missing keys are caught at edit time, not just at CI.