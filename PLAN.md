# AverianLabs — Premium Research Peptide Webstore
## Comprehensive Project Plan (EU + Finland focus)

> Codename: **AverianLabs** • Domain target: `averianlabs.eu` (primary) + `averianlabs.fi` (regional) • Niche: Research-use peptides (B2C + B2B)

---

## 1. Competitor Audit — `crystalpeptides.fi` / `.eu`

### 1.1 What they do well
| Area | Observation |
|---|---|
| **Market reach** | 24 country-specific TLDs (.eu, .fi, .bg, .ro, .de, .fr, .it, .pl, .nl, .cz, .se, .dk, .gr, .sk, .lt, .co.uk, .es, .si, .tr, .hr, .hu, .at, .ch, .be) — full EU + UK + TR coverage |
| **SEO hygiene** | Hreflang alternates, dedicated sitemap.xml, `robots.txt` with Cloudflare content signals, prerender.io for SPA product pages |
| **Trust signals** | Trustpilot widget, COA (Certificate of Analysis) public page per peptide, endotoxin info overlays |
| **Conversion** | Rewards/loyalty program, partner/affiliate program, multi-carrier shipping (NextLevel, Posti, etc.), crypto + card payments, abandoned-cart "recover-checkout" token URLs |
| **Compliance** | Country ban list, age gate (implicit via T&Cs), research-use disclaimers |
| **Performance** | `font-display: swap`, CLS reserved, DNS-prefetch, code-split routes |

### 1.2 Where they look dated / weak
- **Single-color flat blue**, no depth, no glassmorphism or 3D — feels 2022-ish.
- **Standard grid carousels** for products (Swiper/Embla style). No WebGL.
- **SPA-only**: even after prerender, time-to-content is slower than SSR. Heavy `index.js` bundle.
- **No product-relation engine** surfaced to users (only `peptideRelations` data hook — not visibly used).
- **Limited brand storytelling** on home — it's mostly a banner + grid.
- **No CMS** for blog: dates go back only to 2025‑02 — content pipeline appears manual.
- **i18n routing pattern** `^\/(?:[a-z]{2}\/)?` uses sub-paths per locale, but TLDs carry language. Two routing systems — confusing.
- **Cart UX** is a side drawer — common but not premium.

### 1.3 What we will outclass them on (the "100x" promise)
1. **3D WebGL product carousel** with crystal refraction shader, drag-to-orbit, scroll-snap on a torus path.
2. **App Router + RSC** = faster TTFB, better SEO than their prerender hack.
3. **Editorial design system** — typography pair (a serif display + a grotesk), motion language, micro-interactions.
4. **AI peptide assistant** (peptide Q&A grounded in our product docs).
5. **Real-time stock + COA** — every product card shows latest batch ID and live stock.
6. **One coherent i18n model** (sub-path OR TLD, not both).
7. **Better content** — peptide monograph per SKU with research paper citations.

---

## 2. Project Goals

### 2.1 Business goals
1. **Primary**: become the most premium-looking research-peptide storefront in the Nordics + EU.
2. **Conversion**: reach 2.5% store-wide conversion (industry average for supplement/research niches ~1.5%).
3. **Trust**: every product page must show batch-specific COA, endotoxin report, and HPLC/MS results.
4. **Reach**: launch on `.eu` (default, English) + `.fi` (Finnish) + `.de` + `.se` + `.nl` day 1; add 8 more locales within 90 days.

### 2.2 Technical goals
- **Lighthouse**: Performance ≥ 95, A11y ≥ 95, SEO = 100, Best Practices ≥ 95 on the home page (mobile).
- **LCP** ≤ 1.5 s on 4G, **INP** ≤ 150 ms, **CLS** ≤ 0.02.
- **Bundle**: First-load JS ≤ 120 KB gzipped on home (excluding the 3D scene, which is code-split).
- **Uptime**: 99.9% via Vercel + Cloudflare.
- **GDPR**: zero third-party tracking pixels fired before consent. PostHog (EU-hosted) or self-hosted Plausible.

### 2.3 Compliance (EU + FI specific)
- **Research-use only** disclaimer shown on every product card, product detail, cart, checkout confirmation, and email footer.
- **No medical claims** — copy vetted against EU Regulation 2017/745 (MDR) and Finnish Medicines Act (395/1987).
- **Age gate 18+** soft-modal with cookie persistence.
- **GDPR** — DSAR endpoint, cookie banner with reject-all option, DPA with all processors.
- **VAT** — EU OSS (One Stop Shop) registration, prices shown VAT-inclusive, B2B VAT-ID validation via VIES.
- **Country restrictions** — maintain dynamic block list (mirroring competitor's `bannedCountries`), default-deny non-served countries.
- **Payment** — Stripe (EU entity) for cards + iDEAL + Klarna; Coinbase Commerce for BTC/ETH/USDC.

---

## 3. Tech Stack — "2026 Modern" (every choice justified vs. competitor)

### 3.1 Frontend
| Layer | Choice | Why better than competitor |
|---|---|---|
| Framework | **Next.js 15 (App Router, React 19)** | They use Vite SPA + prerender hack. We get RSC, streaming, PPR, server actions, file-based i18n. |
| Language | **TypeScript (strict)** | Their codebase is TS but uses default loose config; we go full strict + `noUncheckedIndexedAccess`. |
| Styling | **Tailwind CSS v4** + **shadcn/ui** + **Radix Primitives** | They use Tailwind + custom shadcn-like tokens. We get v4's CSS-first config (faster, less JS). |
| 3D | **React Three Fiber 9** + **drei** + **three.js r170** + **@react-three/postprocessing** | Competitor has none. Crystal refraction + bloom = our signature. |
| Motion | **Framer Motion 11** for UI, **R3F's useFrame + spring** for 3D | One motion language across 2D/3D. |
| State | **Zustand 5** (cart, UI), **TanStack Query 5** (server cache), **nuqs** (URL state) | They appear to use React Context + custom hooks — we get ergonomics + devtools. |
| Forms | **React Hook Form** + **Zod** + **@hookform/resolvers** | Type-safe, performant. |
| Icons | **Lucide** (consistent 1.5px stroke) | They mix multiple icon sets. |
| Fonts | **Geist Sans + Geist Mono** via `next/font` (self-hosted, zero CLS) | They use Google Fonts (extra DNS roundtrip). |

### 3.2 Backend / Data
| Layer | Choice | Why |
|---|---|---|
| API | **Next.js Route Handlers** (`app/api/*`) + **Server Actions** | Single deploy unit. |
| Database | **PostgreSQL** on **Neon** (EU-Frankfurt region) — branchable, serverless | Competitor uses Supabase Postgres. Neon gives us DB branching per PR. |
| ORM | **Drizzle ORM** | Type-safe, no runtime overhead, SQL-transparent. |
| Auth | **Auth.js v5 (NextAuth)** with Email (Resend) + OAuth (Google) + WebAuthn passkeys | Competitor uses custom auth + SMS unsubscribe. We go passkey-first. |
| File storage | **Cloudflare R2** (S3-compatible, no egress) | Product images, COA PDFs, blog media. |
| Search | **Meilisearch** (self-hosted on Fly.io EU) | Faceted product search, instant. |
| Email | **Resend** + **React Email** | Transactional: order confirmations, COA delivery, abandoned cart. |
| CMS | **Sanity** (embedded studio at `/studio`) for blog + peptide monographs | Editorial team can write without touching code. |
| Cache/Queue | **Upstash Redis** (EU) + **QStash** for scheduled jobs (price sync, sitemap regen) | |

### 3.3 Payments / Logistics
| Layer | Choice |
|---|---|
| Payments | **Stripe** (EU entity, all EU methods incl. Klarna, iDEAL, Bancontact, SEPA, GiroPay) + **Coinbase Commerce** (crypto) |
| Shipping | **Posti** (FI), **DHL Express**, **DPD**, **GLS** via aggregator **Sendcloud** |
| VAT | **Stripe Tax** + manual VIES check on B2B checkout |
| Invoice PDF | **@react-pdf/renderer** for invoices, COA delivery |

### 3.4 Ops / Quality
| Layer | Choice |
|---|---|
| Hosting | **Vercel** (Pro plan, EU region `fra1`) |
| CDN/DDoS | **Cloudflare** in front of Vercel |
| Analytics | **PostHog Cloud EU** (product analytics) + **Plausible** (privacy-friendly pageviews) |
| Error tracking | **Sentry** (EU region) |
| Feature flags | **Vercel Edge Config** + **GrowthBook** (self-hosted) |
| Testing | **Vitest** (unit), **Playwright** (e2e + visual), **Storybook 8** (component docs) |
| CI/CD | **GitHub Actions** → typecheck → lint → test → preview deploy → Lighthouse CI gate |
| Code quality | **Biome** (single linter+formatter, faster than ESLint+Prettier) |
| Git hooks | **Lefthook** + **commitlint** (Conventional Commits) |

---

## 4. Brand & Design System

### 4.1 Brand identity
- **Name**: AverianLabs
- **Tagline**: *"Precision peptides for serious research."*
- **Tone**: clinical-precision + premium-editorial. Think *Apple* meets *Nature* journal.
- **Logo**: wordmark "AVERIAN" with a custom-drawn "Æ" ligature where the crossbar forms a double helix stroke. Wordmark + monogram.

### 4.2 Color tokens (HSL, dark + light)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `210 30% 99%` | `222 28% 6%` | Page background |
| `--surface` | `0 0% 100%` | `222 26% 9%` | Cards |
| `--surface-2` | `210 30% 96%` | `222 24% 12%` | Subtle elevation |
| `--ink` | `220 30% 12%` | `210 25% 96%` | Primary text |
| `--ink-muted` | `220 12% 38%` | `215 12% 65%` | Secondary text |
| `--accent` (signature) | `214 95% 52%` | `214 90% 60%` | CTAs, links, brand blue |
| `--accent-soft` | `214 95% 96%` | `214 60% 18%` | Tinted backgrounds |
| `--ice` | `196 85% 60%` | `196 80% 65%` | 3D crystal accent |
| `--success` | `152 60% 42%` | `152 55% 55%` | In-stock badges |
| `--warn` | `38 95% 52%` | `38 90% 58%` | Low-stock |
| `--danger` | `0 75% 55%` | `0 70% 65%` | Out-of-stock, errors |
| **`research` overlay** | `0 0% 100% / 0.04` | `0 0% 0% / 0.4` | Glassmorphism on hero/3D |

### 4.3 Typography
- **Display**: `Geist` 700, -2% tracking, used for hero h1 only.
- **Headings**: `Geist` 600, optical sizing.
- **Body**: `Geist` 400/500, 16px base, 1.6 line-height.
- **Mono**: `Geist Mono` for SKU, batch IDs, peptide sequences.
- **Editorial accent**: optional `Fraunces` (serif) for blog post intros.

### 4.4 Spacing / radius / shadows
- 4-pt grid. Container max-width 1280.
- Radius scale: `--r-sm 6px`, `--r 12px`, `--r-lg 20px`, `--r-xl 32px`, `--r-full 999px`.
- Shadows: layered, soft, color-tinted (`0 1px 2px rgba(15,30,80,.04), 0 8px 24px rgba(15,30,80,.06)`).

### 4.5 Motion language
- **Spring** `{ stiffness: 220, damping: 28 }` for UI.
- **Spring** `{ stiffness: 120, damping: 18, mass: 0.8 }` for 3D.
- **Easing** `cubic-bezier(.2,.8,.2,1)` ("ease-out-crystal") as default for entrances.
- **Reduced motion**: every animation gated by `prefers-reduced-motion`; falls back to instant or 200ms ease.

### 4.6 Iconography
- Lucide 1.5px stroke, 20px default, 24px on touch targets. Custom additions: peptide helix, vial, COA stamp.

---

## 5. Information Architecture

### 5.1 Routes (sub-path locale strategy — one model, clean)
```
/[locale]/
  ├─ page.tsx                       # Home (hero + 3D carousel + featured + trust + blog teaser)
  ├─ shop/
  │   ├─ page.tsx                   # Catalog (filters + grid/3D toggle)
  │   └─ [slug]/
  │       └─ page.tsx               # Product detail
  ├─ coa/
  │   └─ [batchId]?                 # Public COA viewer
  ├─ lab-tests/                     # Methodology page (HPLC, MS, endotoxin)
  ├─ peptide-calculator/            # Dosage / reconstitution tool
  ├─ blog/
  │   ├─ page.tsx                   # Index
  │   └─ [slug]/page.tsx            # Post
  ├─ rewards/                       # Loyalty program
  ├─ partner/                       # Affiliate / B2B application
  ├─ account/                       # Orders, addresses, subscriptions, COA library
  ├─ checkout/
  │   ├─ cart/
  │   ├─ address/
  │   ├─ shipping/
  │   ├─ payment/
  │   └─ confirm/[orderId]/
  ├─ support/
  │   ├─ faq/
  │   ├─ contact/
  │   └─ shipping-returns/
  ├─ legal/
  │   ├─ terms/
  │   ├─ privacy/
  │   ├─ cookies/
  │   └─ research-disclaimer/
  ├─ age-gate/                      # 18+ soft gate (modal not route, but exposed)
  └─ (marketing)/
      ├─ about/
      └─ quality/
```

Locales: `en`, `fi`, `de`, `sv`, `nl`, `fr`, `es`, `it`, `pl`, `cs`, `da`, `no`, `et`, `lv`, `lt`. (15 locales day-1.)

### 5.2 Navigation
- **Top bar**: Logo • Shop • Lab Tests • Calculator • Blog • About • **{Locale switcher}** • **Account** • **Cart** (live count badge).
- **Sticky on scroll**, blur backdrop, 8px → 64px height transition.
- **Footer**: 4 columns (Shop, Research, Company, Legal) + newsletter + social + payment-method icons + "Research use only" badge.

---

## 6. Page-by-Page Spec

### 6.1 Home `/[locale]`
Sections (top to bottom):
1. **Hero** — 100vh. Left: display headline + sub + dual CTA (Shop / Read research). Right: live 3D scene (the carousel, see §7). Subtle parallax mouse-move on the headline.
2. **Trust strip** — marquee of badges: "EU-GMP vendor", "Third-party HPLC tested", "Endotoxin < 5 EU/mg", "24h EU dispatch", "ISO 17025 lab partner", "GDPR compliant".
3. **Featured peptides** — the 3D circular carousel (the signature element).
4. **Categories** — horizontal scroll cards: *Weight-management research*, *Recovery & tissue*, *Cognitive*, *Longevity*, *Cosmetic research*, *Custom synthesis*.
5. **Lab transparency** — split section: copy on left, animated COA-PDF preview on right (real PDF rendered, paged).
6. **Peptide calculator teaser** — "Try our reconstitution calculator" with input mock.
7. **Editorial / blog** — 3 latest posts.
8. **B2B partner CTA** — "Research institutions & resellers".
9. **Newsletter** — single-line email input, GDPR consent checkbox.
10. **Footer**.

### 6.2 Shop `/[locale]/shop`
- **Toolbar**: search (Cmd-K opens command palette), filter sidebar (form, purity %, vial size, category, price, in-stock), view-mode toggle (Grid / **3D Circle** / List), sort.
- **Grid**: 4 cols desktop, 2 tablet, 1 mobile. Each card: 3:4 image, purity badge, batch ID (mono), price, "research use" strip, hover lifts with shadow + quick-view.
- **3D view toggle**: replaces grid with the same carousel concept — entire catalog on a torus, scroll-to-rotate.
- **Pagination**: cursor-based (infinite scroll with sentinel).

### 6.3 Product `/[locale]/shop/[slug]`
- **Gallery**: 3D-rotatable vial (drag to spin, auto-idle). Below: thumbnails.
- **Right rail**: name, SKU, "research use only" pill, purity %, vial size selector, qty, price (with VAT note), **Add to cart**, **Add COA to library**, "In stock — ships in 24h" / low-stock counter.
- **Tabs**: Description • Specifications (CAS, MW, sequence, formula, storage) • COA & Lab Tests (last 3 batches with PDFs) • Reconstitution guide • Citations (papers) • FAQ.
- **Sticky add-to-cart** on mobile scroll.
- **Schema.org**: `Product`, `Offer`, `BreadcrumbList`.

### 6.4 Cart `/[locale]/checkout/cart`
- Line items with thumbnail, vial size, qty stepper, remove.
- Promo code input, points redemption slider (rewards).
- Subtotal, shipping estimate (country-driven), VAT line, total.
- Empty state: illustration + "Browse bestsellers" link.
- Persistent drawer available site-wide (right side, glass surface).

### 6.5 Checkout (4 steps)
1. **Email** + guest vs. account.
2. **Address** + VAT-ID (B2B toggle → VIES validation).
3. **Shipping** (carrier options with ETAs).
4. **Payment** (Stripe Elements + crypto option). 3-D Secure 2 supported.
- Apple Pay / Google Pay express button on step 1.
- All steps SSR for speed; form state preserved in server action + cookie.

### 6.6 COA `/[locale]/coa/[batchId]`
- PDF embed + structured metadata (test name, method, result, spec, pass/fail, lab, date).
- Share-link generation.
- "Download as PDF" + "Request retest" button.

### 6.7 Peptide calculator
- Inputs: peptide mass (mg), bacteriostatic water volume (mL), desired dose (mcg), syringe (IU/mL).
- Outputs: volume to draw (mL + IU), concentration (mg/mL), doses remaining.
- Save scenarios to account.

### 6.8 Blog (Sanity-driven)
- MDX support via Sanity portable text + custom code block.
- Author cards, related peptides (data hook), share, table of contents, reading progress.

### 6.9 Partner
- Application form (org details, use case, expected volume) → CRM (HubSpot free) → admin review queue.

### 6.10 Rewards
- Tiers (Apex / Crystal / Aurora) with point rules, redemption marketplace, referral link.

### 6.11 Account
- Orders list, addresses, COA library, peptide subscriptions (re-order every N weeks), security (passkeys), data export (GDPR Art. 20), delete account (Art. 17).

### 6.12 Legal pages
- Generated from MDX in repo, versioned, signed-off by counsel.

---

## 7. The 3D Circle Carousel — Detailed Spec

### 7.1 Goals
A product carousel rendered as a **torus** of vials floating in space. The user can:
- **Drag** horizontally → rotates the torus (momentum + inertia).
- **Scroll** → rotates the torus one slot per snap.
- **Click** a vial → flies it to center, opens product detail in a side panel.
- **Tab/arrow keys** → navigate slots.
- **Hover** a vial → it lifts forward, others dim.
- **Auto-rotation** by default (pauses on focus / hover / reduced-motion).

### 7.2 Technical implementation
- **Canvas**: one `<Canvas>` from R3F, `dpr=[1,2]`, `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}`.
- **Geometry**: each vial is a `RoundedBox` (body) + `Cylinder` (cap) + label as a `Plane` with text texture (canvas-baked to texture for perf).
- **Material**: `MeshPhysicalMaterial` with `transmission: 0.85`, `roughness: 0.05`, `thickness: 1.2`, `ior: 1.45`, `clearcoat: 1`. → real glass refraction.
- **Lighting**: 1 HDRI (`studio_small_03_1k.hdr` from Poly Haven, ~150 KB), 1 directional key, 1 rim, 1 ambient.
- **Postprocessing**: `<EffectComposer>` with `<Bloom luminanceThreshold={0.85} intensity={0.6} />`, `<ChromaticAberration offset={[0.0005,0.0005]} />`, `<Vignette eskil={false} offset={0.2} />`.
- **Particles**: 200 instanced points (instaMesh) drifting in background, depth-tinted.
- **Layout**: products laid out on a circle of radius `R = 8`, y-offset using `Math.sin(angle)` for gentle wave.
- **State**:
  - `angle` (Zustand) → controlled by `useGesture` for drag.
  - `selected` → drives side-panel open animation (Framer Motion layout).
- **Performance**:
  - Vial instances created with `<Detailed>` (LOD): low-poly when far, high-poly when near.
  - Textures lazy-loaded.
  - Canvas only mounts after first user interaction (IntersectionObserver on hero). Pre-rendered poster image shown first.
  - Falls back to static grid carousel if WebGL unavailable.
- **Accessibility**:
  - `<canvas>` has `aria-hidden=true`; a hidden `<ul role="list">` mirrors products for screen readers.
  - Keyboard controls: ← / → rotate, Enter selects, Esc closes.
  - `prefers-reduced-motion` → disable auto-rotation, snap without easing.

### 7.3 Variants
- **Hero**: 7 products, slow auto-rotation.
- **Shop "3D view"**: all products (cap at 24 visible), filter changes the set with a smooth transition (incoming items fade in at angle offset, outgoing items fly out).
- **Category page header**: 5 products of that category, brand-tinted glass color.

---

## 8. Database Schema (Drizzle / Postgres)

> Abbreviated — full migration in `/db/schema/*`.

```ts
users(id, email, name, locale, role, passwordHash?, createdAt)
accounts(id, userId, provider, providerAccountId)                // OAuth links
passkeys(id, userId, credentialId, publicKey, counter)
addresses(id, userId, line1, line2, city, postal, country, isDefaultBilling, isDefaultShipping)
products(id, slug, defaultName, defaultDescription, casNumber, molecularFormula, molecularWeight, sequence, storageTemp, categoryId, status)
product_translations(id, productId, locale, name, description, marketingCopy)
categories(id, slug, parentId?)
vials(id, productId, sizeMg, sku, priceCents, compareAtCents?, stockQty, lowStockThreshold)
batches(id, vialId, batchCode, manufacturedAt, expiresAt, hplcPurity, endotoxinEUPerMg, msConfirmed, coaPdfR2Key, labName)
coa_tests(id, batchId, testName, method, result, spec, pass, performedAt)
orders(id, userId?, email, status, subtotalCents, shippingCents, vatCents, totalCents, currency, stripePaymentIntentId?, cryptoTxHash?, placedAt)
order_items(id, orderId, vialId, qty, unitPriceCents, batchId)
shipments(id, orderId, carrier, service, trackingNumber?, labelUrl?, status, shippedAt, deliveredAt?)
addresses_orders(orderId, billingAddressId, shippingAddressId)
reviews(id, productId, userId, rating, title, body, approved, createdAt)
rewards_accounts(id, userId, pointsBalance, tier)
rewards_ledger(id, accountId, delta, reason, refType, refId, createdAt)
partner_applications(id, orgName, contactEmail, country, useCase, volume, status)
subscriptions(id, userId, vialId, qty, intervalWeeks, nextChargeAt, status)
audit_log(id, actorId, action, entity, entityId, diffJson, createdAt)
banned_countries(code)                                            // sync from policy
```

- **Soft delete** on products, users.
- **Indexes** on (slug), (locale, slug), (batchCode), (userId, status).
- **RLS** via Drizzle middleware (org scope only for partners, none for retail).

---

## 9. API Surface

### 9.1 Public (Server Actions / Route Handlers)
- `getProducts({ category, sort, cursor })`
- `getProductBySlug(slug, locale)`
- `getBatches(vialId)`
- `getCoa(batchId)`
- `searchProducts(q, filters)` → Meilisearch proxy
- `calculateReconstitution(input)`
- `validateVatId(id, country)` → VIES
- `getShippingOptions(address, items)`
- `createPaymentIntent(items, address, email)`
- `createCryptoCharge(items, address, email)`
- `submitPartnerApplication(payload)`
- `subscribeNewsletter(email, locale)`

### 9.2 Webhooks
- `POST /api/webhooks/stripe` — payment_intent.succeeded → mark order paid, send confirmation email, enqueue shipment label.
- `POST /api/webhooks/coinbase` — charge:confirmed → same.
- `POST /api/webhooks/sendcloud` — shipment status → update order, notify user.
- `POST /api/webhooks/sanity` — content published → revalidate paths.

### 9.3 Admin
- `/admin` (Drizzle Studio + custom views) — gated by `role = 'admin'`.

---

## 10. Internationalization

- **Library**: `next-intl` 4 with App Router.
- **Default locale**: `en`. Country TLDs (`/fi/...`, `/de/...`) **rewrite** to the same locale segment via middleware (we keep ONE URL model — sub-path). Domains `.fi`, `.de` etc. each host a build with `defaultLocale` overridden.
- **Message catalogues** in `/messages/{locale}.json`, lazy-loaded.
- **Content strategy**:
  - **Static copy** (UI strings, legal pages) → JSON catalogues.
  - **Product names/descriptions** → DB (`product_translations`). Falls back to default locale if missing.
  - **Blog** → Sanity (one document per locale, linked via `i18n` field).
- **Currency**: prices stored in EUR cents (base). Displayed in local currency via ECB rate (refreshed daily, QStash cron). User can lock to EUR.
- **Number/date formatting**: native `Intl`.
- **Hreflang**: generated sitemap.
- **SEO slugs**: keep English slugs globally to avoid duplicate-content confusion.

---

## 11. Payments

### 11.1 Stripe
- One Stripe account (IE entity) with multi-currency presentment.
- Enable: card, Apple Pay, Google Pay, iDEAL, Bancontact, Klarna, SEPA Direct Debit, GiroPay, EPS, Przelewy24.
- Stripe Tax on for VAT calculation + OSS reporting.
- 3-D Secure 2 enforced for EU cards where required by SCA.
- Refund + partial refund via admin.
- Webhook idempotency via Stripe event ID stored in `processed_webhooks` table.

### 11.2 Crypto
- Coinbase Commerce hosted checkout (no custodial wallet on our side).
- 15-min price lock; expiry → automatic order cancel.

### 11.3 B2B invoicing
- Net-14 manual invoice option for approved partners (admin only).

---

## 12. SEO Strategy

- **Per-page metadata** via `generateMetadata` + `next/og`.
- **JSON-LD**: `Organization`, `WebSite` (with `SearchAction`), `Product`, `Offer`, `BreadcrumbList`, `Article`, `FAQPage`.
- **Sitemaps**: split by type (products, blog, static). Generated at build + on-demand via `revalidatePath`.
- **robots.txt**: per-locale.
- **Canonical** with locale + hreflang alternates.
- **OG images**: generated at edge via `next/og` with product visuals (3D scene snapshot).
- **Structured data tested** with Google Rich Results test in CI.
- **Schema.org `Product`**: includes `aggregateRating` once we have ≥ 10 reviews.

---

## 13. Performance Plan

- **Image pipeline**: `next/image` with AVIF/WebP, `priority` only on hero LCP element, `placeholder="blur"` with pre-computed LQIP.
- **Font pipeline**: `next/font` with `display: 'swap'` + `preload: true`.
- **JS budgets**: enforced in CI via `next-bundle-analyzer` + size-limit.
- **3D scene**: code-split (`next/dynamic({ ssr: false })`), idle-loaded.
- **Caching**:
  - Static + ISR for product/blog pages (`revalidate = 3600`).
  - Edge cache for `/api/products` GETs with `s-maxage` + tag invalidation on stock change.
  - CDN cache on Cloudflare (bypass on `/api/checkout/*`).
- **Image CDN**: Cloudflare Images for resizing + Polish.
- **Service worker**: optional (Phase 2) for offline catalog view.

---

## 14. Security & Privacy

- **CSP**: strict, with nonce per request. No `unsafe-inline`. Stripe + Coinbase added to `frame-src`.
- **HSTS** + `X-Content-Type-Options: nosniff` + `Referrer-Policy: strict-origin-when-cross-origin`.
- **Rate limiting**: `@upstash/ratelimit` on all write endpoints.
- **CSRF**: Server Actions built-in + Origin header check.
- **PII**: encryption at rest (Neon), TLS 1.3 in transit.
- **Secrets**: Vercel env + Doppler.
- **DPIA** filed and stored in repo `/legal/dpia.md`.
- **Subprocessors list** public at `/legal/privacy#subprocessors`.

---

## 15. Project Structure

```
averianlabs/
├─ app/
│  ├─ [locale]/
│  │  ├─ (marketing)/...
│  │  ├─ (shop)/...
│  │  ├─ (account)/...
│  │  └─ (legal)/...
│  ├─ api/
│  │  ├─ webhooks/{stripe,coinbase,sendcloud,sanity}/route.ts
│  │  └─ .../route.ts
│  ├─ studio/[[...index]]/page.tsx           # Sanity Studio
│  ├─ sitemap.ts
│  ├─ robots.ts
│  └─ layout.tsx
├─ components/
│  ├─ ui/                                    # shadcn primitives
│  ├─ motion/
│  ├─ three/                                 # Carousel, Vial, ParticleField
│  ├─ product/{Card,Detail,Gallery,CoaList}.tsx
│  ├─ cart/, checkout/, account/, blog/, ...
├─ db/
│  ├─ schema/
│  ├─ migrations/
│  └─ seed.ts
├─ lib/
│  ├─ auth/, i18n/, payments/, shipping/, vat/, analytics/
├─ messages/{en,fi,de,...}.json
├─ styles/{globals.css,tokens.css}
├─ public/{fonts,images,og,lqip}/
├─ tests/{unit,e2e,visual}/
├─ .github/workflows/{ci,release}.yml
├─ biome.json, drizzle.config.ts, next.config.ts, package.json, tsconfig.json
```

---

## 16. Build Phases & Timeline

> Solo-friendly with focused sprints. Calendar weeks are estimates.

| # | Phase | Deliverables | Weeks |
|---|---|---|---|
| **0** | **Foundation** | Repo, CI, Biome, Drizzle + Neon, Auth.js, Sanity Studio, base layout, design tokens, font, light/dark, locale routing, `age-gate`, robots, sitemap, GDPR banner | 1.5 |
| **1** | **Catalog + 3D** | Products schema + seed (15 SKUs across 5 categories), Shop grid, Product detail, **3D carousel** (hero variant), COA public page, search (Meilisearch) | 2 |
| **2** | **Cart + Checkout** | Cart drawer, 4-step checkout, Stripe + Coinbase, addresses, VIES, shipping options, order confirmations, Resend emails, admin order view | 2 |
| **3** | **Account + Rewards + Partner** | Account dashboard, COA library, subscriptions, rewards engine, partner application + admin queue | 1.5 |
| **4** | **Content + Calculator + Lab** | Blog (Sanity), peptide calculator, lab-tests methodology page, citations engine | 1 |
| **5** | **i18n launch** | Translate all static strings + product translations for 5 priority locales (en, fi, de, sv, nl) | 1.5 |
| **6** | **Polish + Perf** | Lighthouse pass, motion audit, reduced-motion, OG generation, structured data, visual regression, accessibility audit (axe) | 1 |
| **7** | **Launch** | DNS, Cloudflare, envs, Sentry, PostHog, Plausible, backups, runbooks, soft launch with 3 invite-only research partners, then public | 0.5 |
| **Total** | | | **~11 weeks** |

---

## 17. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Regulatory drift (FI/EU peptide rules) | Quarterly legal review; "research use only" disclaimer on every surface; country blocklist automation |
| 3D perf on low-end mobile | LOD + cap at 24 items + static fallback + `prefers-reduced-motion` |
| Stripe / Coinbase outage | Stripe has backup; manual admin "mark paid" with audit log for ops emergencies |
| Sanity downtime | Catalog is DB-first; Sanity outage only blocks blog edits, not purchases |
| Vercel region latency outside EU | Multi-region fallback (`fra1` primary, edge cache) |
| Bot scraping / scraping of COA URLs | Rate-limit, signed time-limited COA URLs, Cloudflare bot rules |
| Inventory drift | Stripe source-of-truth → Drizzle update on `payment_intent.succeeded`; nightly reconciliation cron |

---

## 18. Out of scope (v1)
- Native mobile apps (PWA-friendly site first).
- Subscription auto-refills beyond weekly cadence (manual reorder).
- Customer-facing chat (use email + form).
- Multi-warehouse inventory (single EU hub at launch).

---

## 19. Definition of Done (v1 launch)
- Lighthouse mobile ≥ 95 on home, shop, product.
- All 15 SKUs have ≥ 1 batch with COA uploaded.
- 5 locales fully translated (en/fi/de/sv/nl).
- Stripe live mode + 1 successful end-to-end test transaction.
- Crypto live mode + 1 successful test charge.
- Backup policy + restore drill executed.
- DPIA + T&Cs + Privacy + Cookies signed off by counsel.
- Sentry + PostHog + Plausible live, dashboards built.
- Lighthouse CI gate passing on `main`.

---

## 20. Open questions for you (please answer before we start building)
1. **Brand name**: "AverianLabs" confirmed, or do you have a preferred name?
2. **Domains**: do you already own `averianlabs.eu` / `.fi`, or should I plan with placeholders?
3. **Backend hosting preference**: Vercel + Neon (recommended) or do you want a specific EU provider (Hetzner, OVH)?
4. **CMS**: Sanity (recommended, best DX) vs. Payload CMS (self-hosted, more control)?
5. **Payments**: Stripe (recommended) + Coinbase Commerce OK, or do you want Mollie / a specific regional processor?
6. **Shipping aggregator**: Sendcloud OK? Or do you have carrier contracts already (Posti, DHL, DPD direct)?
7. **B2B / partner program in scope for v1, or v2?**
8. **Reviews**: in v1 or v2?**
9. **Initial SKU list**: do you have one, or should I seed 15 placeholder SKUs (BPC-157, TB-500, GHK-Cu, Semaglutide, Tirzepatide, Semax, Selank, Epithalon, Ipamorelin, CJC-1295, Melanotan II, PT-141, Tesamorelin, AOD-9604, KPV)?
10. **3D carousel hero** — yes for sure, but should the **Shop "3D view"** toggle also be v1?

---

*End of plan. Approve and I will scaffold the project in the next turn.*
