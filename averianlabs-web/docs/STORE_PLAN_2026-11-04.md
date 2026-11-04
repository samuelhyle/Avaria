# Store plan — becoming the number-one peptide store in Finland

**Date:** 4 November 2026
**Scope:** strategy + roadmap for `averianlabs-web`
**Live site:** https://averianlabs-demo.netlify.app
**Benchmark set:** crystalpeptides.fi (FI), corepeptides.com (US), biotechpeptides.com (US), nordicpeptides.com (EU/EUR)

---

## 0. Method

What was read, not guessed:

| Source | How | What was extracted |
|---|---|---|
| crystalpeptides.fi | `curl` + Playwright render (Vite SPA, no SSR) | Full 60-product catalogue with live EUR prices, Finnish hero/PDP copy, 23 blog titles, 98 sitemap URLs, 16 country domains, 19 hreflang locales |
| corepeptides.com | `curl` | Full 104-product catalogue with USD prices, hero copy, PDP section list, named scientist |
| biotechpeptides.com | `curl` | Catalogue + prices, positioning copy, FDA/503A/503B disclaimer structure, custom-synthesis service |
| nordicpeptides.com | `curl` | Outcome-led category taxonomy, multi-currency list, bundle/plan programme, sale merchandising |
| averianlabs-demo.netlify.app | `curl` + render | Live `/en`, `/en/shop`, `/en/shop/bpc-157` HTML — what a customer actually sees today |
| `averianlabs-web` repo | full read | 175 components / 330 lib files / 52 DB tables / 65 routes / 76 API routes; seeded data counts; buyability logic |

Prices below are **observed, not estimated**. Finnish copy is quoted verbatim where the wording matters.

---

## 1. The headline: we are not a store yet

> **`/en/shop/bpc-157`, live, today:** "Availability and batch documentation are currently unavailable. Contact us before ordering." — "Pricing: **Quote only**" — "Out of stock — notify me"

Every one of our 15 products is unbuyable. This is not a content problem or a design problem. It is one line of seed configuration:

- `db/seed.ts:28` — `status: "draft"` on every product
- `db/seed.ts:54` — `stockQty: 0`
- `db/seed.ts:56` — `purchaseMode: "unavailable"`
- `lib/products/catalogue.ts:230-237` — `direct` requires `status === "active"` **and** verified specs **and** a released batch **and** `priceCents > 0`
- `scripts/seed-local-demo.ts:47` — the only thing that promotes products to sellable **refuses to run against a non-localhost database**

The hosted build (`scripts/netlify-build.mjs`) runs `pnpm db:seed` and nothing else. So production is permanently: 15 browsable, unbuyable products.

Meanwhile Crystal Peptides is selling 60 products at €4.99–€139.99 with cards, transfers and crypto.

**Consequence:** nothing we build — 3D, AI concierge, community, certificate library — can be sold until one lot exists. Phase 0 exists to remove that blocker.

---

## 2. Competitive teardown

### 2.1 Crystal Peptides (the Finnish benchmark)

63 products, 23 blog posts, 16 country domains (`crystalpeptides.fi/.bg/.ro/.de/.fr/.it/.pl/.nl/.es/.pt/.hu/.cs/.sk/.da/.el/.lt` + `.eu`), 19 hreflang locales (en, fi, sv, bg, ro, de, fr, it, pl, nl, es, pt, hu, cs, sk, da, el, lt + x-default).

**Hero promises (Finnish, verbatim):**
- "Osta korkealaatuisia peptidejä tutkimukseen"
- "Valmistettu ja toimitettu EU:ssa"
- "Poikkeuksellinen laatu — Eräkohtaiset Janoshik-testit: määrä ja puhtaus (>99 %) · steriiliys · endotoksiini · raskasmetallit"
- "Nopea ja ilmainen toimitus — Ilmainen toimitus yli €200, 7-9 työpäivää Suomeen"
- "Kilpailukykyiset hinnat — Markkinoiden kilpailukykyisimmät hinnat ja lisäalennuksia suuremmista määristä (jopa 30 %)"
- "Turvalliset maksut — Tilisiirto, Kryptomaksut, **Korttimaksut (pian)**"

Note: their card payments are "coming soon". We have Stripe wired but unkeyed. **Cards are a live advantage, not a gap.**

**Their trust model — the single most important thing they do:**
Every product has a **Janoshik** (independent third-party lab) report, and the customer can verify authenticity by entering the report ID on Janoshik's public verification page. Their `/coa` library lists every test per product per batch — purity, endotoxin, heavy metals, sterility, and **"Aiempi erä" (previous batch)** entries. The claim is not "trust us", it is "check it yourself, elsewhere, without our permission".

**Their PDP anatomy (BPC-157):** certificate badge strip → Trustpilot 4.7/5 from 384 reviews → size selector → price → **quantity discount table (5-9 → 10 %, 10-19 → 20 %, 20+ → 30 %)** → dated delivery estimate with cutoff time → shipping-insurance promise → "Osta ja ansaitse 27 pistettä!" → Description / Storage / Shipping tabs → long scientific narrative with real citations (Chang 2011, Chang 2014, McGuire 2025, Yuan 2026) and explicit preclinical-only caveats → chemical properties table (sequence, CAS, PubChem CID, formula, MW, length, appearance, solubility, storage both states) → mechanism of action → research applications → **embedded BPC-157 vs TB-500 vs GHK-Cu vs KPV comparison table**.

**Their product formats:** injection vials, **capsules**, **nasal sprays** (sprays "coming soon"). Capsules include Gut Restore, 5-Amino-1MQ, Methylene Blue, MK-777, BPC-157 500 mcg × 60, NAD+ 500 mg × 60, Noopept, SLU-PP-332, Epithalon, Dihexa.

**Their content angle:** not only research monographs — how-to guides: capsule making, nasal delivery, nasal pump, nasal labels, capsule storage, how capsules work, inside nasal formulations. Practical, searchable, non-clinical.

### 2.2 Core Peptides (US, category leader by volume)

104 products. "Peptides for Sale: US-Made, Third-Party Tested. Trusted for the research community for over 7 years." A2LA-accredited lab, **average purity 99.45 %**, COA published on every product page, same-business-day dispatch for orders before 4 PM ET, free US delivery over $200. Sorts by popularity / latest / price / title. Product pages carry a **named scientist** (Dr. Dimitar Marinov).

### 2.3 Biotech Peptides (US)

"Synthesizing peptides for over 6 years." HPLC-MS confirmed > 99 %, third-party tested with results posted, **custom synthesis of any peptide on request** ("contact us with the sequence and quantity"), a "Knowledge Center", and a correctly structured FDA / 503A / 503B disclaimer block.

### 2.4 Nordic Peptides (EU, EUR — the taxonomy lesson)

Their navigation is **outcome-led, not mechanism-led**: For weight loss · For bodybuilding · For muscle mass · For athletes · For injuries · For joints · For libido · Anti-aging · For sleep · For mood · Peptide Blends · Peptide Plans · Bioregulators · Immune Boosters. Plus "What are peptides?", "Check code", "Specials", wishlist, 22 currencies, sale badges, "Buy Now", and social channels (TikTok, Instagram, YouTube).

### 2.5 What we already have that none of them have

| Asset | Where | Why it matters |
|---|---|---|
| AI concierge "Averia" (RAG + 20 tools + citations, 5 000 LOC) | `lib/ai/**`, `app/api/ai/chat/route.ts` | No competitor has a research assistant. This is the "younger generation" magnet — a lab that answers, not a catalogue that lists. |
| 3D product visualisation | `components/three/**` (13 files) | Every competitor sells a flat white vial on white. Our brand is already visually distinct. |
| Community, research plans, comparison, wishlist | `app/[locale]/community`, `/plans`, `/compare`, `/wishlist` | Crystal has none of these. All are empty because there are no users yet. |
| Certificate library with per-batch assay results | `lib/certificates/assay.ts`, `/certificates` | Deeper than Crystal's COA index — we store results *and* limits, so we can draw measured-vs-spec. |
| Product label + quality chart rendered from the lot's own record | `components/product/ProductLabel.tsx`, `QualityChart.tsx` | Nobody else draws the actual label at reading size. |
| Crypto + Telegram checkout, Stripe, Resend | `lib/crypto/**`, `lib/payments/stripe.ts` | Crystal's cards are "coming soon"; we already have them coded. |
| 4 locales (en/fi/sv/ru), 1 791 message keys at parity | `messages/*.json` | Crystal has 19 locales but a Vite SPA; our i18n is server-rendered and per-route sliced. |
| Partner programme, rewards, referral | `/partner`, `/rewards`, `lib/referral` | Crystal has `/partner` + `/rewards` too — but ours are stubs with a working schema (`rewards_accounts`, `referral_redemptions`). |
| Quotation pipeline with a real order flow | `api/quotes`, `quote_requests`, `lib/orders/**` | **Crystal has no equivalent.** This is the honest way to sell before you have stock. |

**Verdict: we have the better platform and the weaker shop.** They have the inventory, the prices and the traffic. Our advantage is real but currently invisible to a customer, because a customer cannot buy.

---

## 3. Price positioning — we are mispriced, not expensive

Observed EUR prices. Crystal = `crystalpeptides.fi/shop` rendered; ours = `lib/products/data.ts`.

| Product | Ours | Crystal | Ours vs market |
|---|---|---|---|
| BPC-157 5 mg | €39.90 | €26.99 | **+48 %** |
| BPC-157 10 mg | €69.00 | €46.99 | **+47 %** |
| GHK-Cu 50 mg | €39.90 | €27.99 | **+43 %** |
| GHK-Cu 100 mg | €69.90 | €35.00 | **+100 %** |
| BPC-157 + TB-500 10/10 mg | €60.00 | €107.99 | −44 % |
| KLOW 80 mg | €130.00 | €139.99 | −7 % |
| MOTS-c 10 mg | €42.00 | €39.99 | +5 % |
| Melanotan I 10 mg | €39.00 | €39.99 | −2 % |
| NAD+ 1000 mg | €90.00 | €89.49 | +1 % |
| Selank 5 mg | €22.00 | €24.99 | −12 % |
| Semax 10 mg | €39.00 | €44.99 | −13 % |
| BAC water 10 mL | €9.95 | €9.99 | ±0 % |
| Retatrutide 20 mg | €99.00 | €159.99 | **−38 %** |

Findings:

1. **Our hero SKU is 48 % above market.** BPC-157 is the traffic product. At €39.90 against €26.99 we lose the comparison-shopping customer before they read a word of our copy.
2. **We are badly misaligned on size ladders.** GHK-Cu 100 mg at €69.90 against a €35.00 market means our 100 mg is dead. Our 20 mg retatrutide at €99 against €159.99 means we leave money on the table. This is not a margin decision — it is a catalogue that was priced without looking at the market.
3. **We have no 10 mg retatrutide, no 5 mg retatrutide** — Crystal's variant ladder is 10/20/30 mg, and the entry point is the one that gets bought first.
4. **We are missing 45 of their 60 products**, and every one of their capsule products.
5. **Crystal discounts 17–30 % on the homepage, permanently visible.** They are trained customers to expect a lower number than the list price. Our price cards have no discount mechanics at all.

---

## 4. Positioning: *the peptide store with the paper trail*

Not "the cheapest peptides". Not "the most peptides". The gap nobody in Finland owns:

> **Every lot we sell has a published certificate, a measured result against its specification, and a human in Helsinki who answers.**

Crystal's promise is *verify Janoshik*. Ours should be *here is the record, here is the measurement, here is the limit it was measured against, here is the person who signed it off.* They outsource trust to a third party; we should own it end-to-end and make it visible, which our data model already allows and theirs does not.

Three consequences for the brand:

1. **Professional comes from specificity, not from adjectives.** "99 % pure" is a claim. "99.4 % measured by HPLC on batch B-2417-A, spec ≥ 98 %, measured 2026-09-14" is a fact. The storefront must show facts, not adjectives.
2. **Fun comes from the lab, not from a discount banner.** The interesting thing about peptides is the science. Our 3D vial, the assay chart, the batch ledger, the AI concierge and the glossary are all more entertaining than a "-30 %" sticker, and they are things competitors cannot copy quickly.
3. **The audience is researchers and curious professionals, not gym bros.** Nordic's "For bodybuilding / For libido" taxonomy pulls in a crowd that a research-use-only, laboratory-grade brand should not chase — it invites regulatory attention and cheap competitors. We keep the research framing and win on competence and clarity.

---

## 5. Roadmap

Ordered by revenue impact per unit of work. Each phase names the files it touches.

### Phase 0 — Make it a shop (blocking everything else)

| # | Work | Files |
|---|---|---|
| 0.1 | **Production catalogue activation.** A guarded script that promotes the reference catalogue to `active` with price, stock, a released batch, three COA assays and a public CoA document — mirroring `scripts/seed-checkout-test-product.ts`, which is already allowed to run against approved Netlify hosts. Must refuse to invent a batch that has no document behind it. | new `scripts/activate-catalogue.ts`; `scripts/netlify-build.mjs` |
| 0.2 | **Admin publish path.** `/admin/inventory` already adjusts stock. Add: set price, set stock, attach a batch, upload/link the CoA, flip `status` to active, and mark the product "sellable" — with a visible checklist of what is still missing (spec verified, batch released, CoA public, price > 0, stock > 0). | `app/[locale]/admin/inventory/page.tsx`, `components/admin/stock-adjustment.tsx`, `app/api/admin/vials/[vialId]/route.ts` |
| 0.3 | **Sellability checklist on the PDP.** Instead of "Availability and batch documentation are currently unavailable", say precisely which one is missing ("Awaiting the released batch for BPC-157 5 mg"). | `app/[locale]/shop/[slug]/page.tsx`, `lib/products/catalogue.ts` |
| 0.4 | **One real lot.** Owner action: one product, one batch, one CoA, price, stock. Lights up the whole catalogue path end-to-end. | — |
| 0.5 | **Stripe keys + Resend.** Crystal's cards are "coming soon"; ours are coded. Cards are the single biggest conversion unlock in this market. | env only |

**Exit criteria:** one product on the live site shows a price, a stock state, a batch, a downloadable CoA, and completes a card checkout in the demo.

### Phase 1 — Price and catalogue (weeks 1-3)

| # | Work | Files |
|---|---|---|
| 1.1 | **Re-price against the observed market.** BPC-157 5 mg → ~€27-30; GHK-Cu 50/100 mg → ~€28/€35; add the retatrutide 10 mg entry point. Do not chase the lowest — land inside the observed band, then hold. | `lib/products/data.ts` |
| 1.2 | **Add the missing size ladders** (retatrutide 10/20/30, GHK-Cu 50/100, TB-500 5/10, semaglutide, tirzepatide, HCG, glutathione, IGF-1 LR3). | `lib/products/data.ts` |
| 1.3 | **Grow 15 → 40 products** on the same template: kisspeptin, PT-141, SS-31, KPV, GHRP-2/6, ipamorelin, tesamorelin, epitalon, thymosin α-1, Adamax, SNAP-8, MGF, PEG-MGF, semaglutide, tirzepatide, HCG, glutathione, follistatin, FOXO4, DSIP, VIP, oxytocin, LL-37, AICAR, ARA-290, 5-amino-1MQ, PE-22-28, Cartalax, cerebrolysin, MGF… Each needs CAS, formula, MW, sequence, storage and a Finnish description — we already have the writer in the repo (the AI pipeline) and the schema. | `lib/products/data.ts` (980 lines today — extract to per-product files) |
| 1.4 | **Volume discount ladder.** 5-9 → 10 %, 10-19 → 20 %, 20+ → 30 %, as a first-class table on the PDP, priced server-side. | `lib/promotions/service.ts`, `lib/orders/quote.ts`, `components/product/ProductDetailActions.tsx` |
| 1.5 | **Permanent "offer" framing.** We should not fake urgency. Use volume discount + bundle saving + the rewards points instead. | `components/home/StoreHero.tsx` |
| 1.6 | **New categories, outcome-aware but honest.** Add: `metabolic`, `recovery`, `cognitive`, `longevity`, `cosmetic`, `blend`, `supplies` (today) → plus `growth`, `metabolic-agonists`, `cosmetic-copper`, `cognitive-nootropic`, `blends`, `supplies`, `research-starter-kits`. Finnish labels: "Kasvu ja GH", "Aineenvaihdunta", "Ihokosmetiikka", "Kognitiiviset", "Sekoitukset", "Laboratoriomateriaalit", "Aloittelupaketit". | `lib/products/types.ts`, `lib/products/categories.ts`, `db/schema/index.ts` |

### Phase 2 — Formats, kits and the shop that feels like a lab (weeks 3-6)

| # | Work | Files |
|---|---|---|
| 2.1 | **Capsule format.** `vials.size_unit` gains `capsule`; `products.product_type` gains `capsule`. Render a capsule tray in the 3D scene and a capsule label in the gallery. | `db/schema/index.ts` + new `db/migrations/0012_*.sql`, `lib/products/types.ts`, `components/three/Vial.tsx`, `components/product/ProductGallery.tsx` |
| 2.2 | **Nasal spray format.** Same path; spray in `components/three/` and a spray label. Crystal has these as "coming soon" — arriving first is a real headline. | same |
| 2.3 | **Research starter kits.** "Tendon & recovery kit", "GH release panel", "Skin & copper panel", "Cognitive panel" — bundles of existing SKUs at a bundle price, as first-class products with their own page and their own combined CoA. **Nobody in Finland does this.** | new `lib/products/kits.ts`, `lib/orders/quote.ts`, `components/product/FrequentlyBought.tsx` (currently a `return null` stub) |
| 2.4 | **Implement "Frequently bought".** Currently `components/product/FrequentlyBought.tsx:6` returns null. Derive from category + shared research application, with real margin-aware pricing. | `components/product/FrequentlyBought.tsx` |
| 2.5 | **Implement "Subscribe & save".** Currently `components/product/SubscribeSave.tsx:6` returns null. Crystal's Finnish homepage links "Tilaa" (Subscribe). A researcher restocking monthly is a subscription customer, not a repeat customer. | `components/product/SubscribeSave.tsx`, `db/schema/index.ts` (new `subscriptions` table + migration) |
| 2.6 | **Dated delivery promise.** "Dispatch Thursday 5.11, order by 15:00 EET, arrives Mon 16.11 – Wed 18.11" — computed from stock, carrier and cut-off, not hard-coded. | `lib/shipping/index.ts`, `components/product/ProductDetailActions.tsx` |
| 2.7 | **Shipping-insurance promise.** Crystal states it plainly: lost or damaged parcels are replaced, and refunded if a second shipment also fails. Ours is a genuine differentiator (we control our own carrier relationship). | `components/product/ProductDetailActions.tsx`, `lib/shipping/index.ts` |
| 2.8 | **Rewards made real.** `rewards_accounts` and `referral_redemptions` exist; the tables are empty. Points on every order, visible balance, tier benefits. | `app/[locale]/rewards/page.tsx`, `lib/referral/service.ts` |

### Phase 3 — The trust engine (weeks 6-9)

| # | Work | Files |
|---|---|---|
| 3.1 | **Expand the assay set.** Crystal tests purity, endotoxin, heavy metals and sterility per batch. We currently store HPLC, endotoxin and MS. Add **heavy metals and sterility** to `coa_tests` + the quality chart + the label. | `lib/certificates/assay.ts`, `db/schema/index.ts` |
| 3.2 | **Previous-batch history.** Crystal publishes "Aiempi erä" entries. Publish every released batch per product, with its own certificate, so the number can be compared over time. | `lib/certificates/service.ts`, `app/[locale]/certificates/page.tsx` |
| 3.3 | **Reviewer attribution.** A certificate shows who reviewed it and when. We have `batches.reviewed_by` and `reviewed_at` — surface them. Trust is a person, not a PDF. | `components/certificates/CertificateCard.tsx`, `db/schema/index.ts` |
| 3.4 | **A second lab's opinion, or an open method.** Either way, publish the method: HPLC column, gradient, wavelength, MS settings. Crystal's Janoshik link says "check it elsewhere"; ours should say "here is everything needed to check it". | `db/schema/index.ts` (`coa_tests.method` already exists), `lib/certificates/assay.ts` |
| 3.5 | **The comparison table inside the PDP.** Crystal embeds BPC-157 vs TB-500 vs GHK-Cu vs KPV. We have a full `/compare` page — embed a product-scoped version in the PDP for SEO and for the decision. | `components/compare/CompareTable.tsx`, `app/[locale]/shop/[slug]/page.tsx` |
| 3.6 | **Own the "unknown" honestly.** For reference products with no lot, our label says "No released lot". Keep that. It is the reason a buyer trusts the lots we *do* list. | `components/product/ProductLabel.tsx` |

### Phase 4 — Being found (weeks 9-13)

| # | Work | Files |
|---|---|---|
| 4.1 | **Finland-first SEO.** Crystal's PDP is a long, citable, Finnish scientific document — that is how they own the search results, not with ads. We need the same: one long, cited, Finnish article per product, plus per-product schema. | `lib/blog/posts.ts`, `scripts/seed-blog.ts`, `lib/seo/metadata.ts` |
| 4.2 | **Practical how-to content.** Capsule making, reconstitution, storage, nasal delivery, transport — Crystal writes these because they are what people actually search for at 23:40. | `scripts/seed-blog.ts`, `lib/demo/fixtures.ts` |
| 4.3 | **Glossary → traffic.** We have 31 glossary terms in the seed and a term page template. Every term is an article. | `lib/glossary/sanity.ts`, `app/[locale]/glossary/[term]/page.tsx` |
| 4.4 | **Country domains.** Crystal runs 16 with hreflang. We should do `.fi` (primary) + `.eu`, then NL/DE/SV only when the translation and the legal pages are native — never machine-translated legal pages. | `middleware.ts`, `next.config.ts`, `lib/seo/site-origin.ts` |
| 4.5 | **Comparison and alternative pages** ("BPC-157 vs TB-500", "retatrutide vs semaglutide") — highest-intent, lowest-competition search in this category. | `app/[locale]/compare/page.tsx` |
| 4.6 | **A public lab notebook.** Every batch we release, in order, with dates and results. This is the page nobody can copy because it is a real operating history. | `components/home/StoreLedger.tsx`, `app/[locale]/certificates/page.tsx` |

### Phase 5 — The company around the store (continuous)

| # | Work | Files |
|---|---|---|
| 5.1 | **Community activation.** Forum exists with 7 categories and zero threads. Seed it with real technical threads (from the blog) and let the AI moderator do its job. | `app/[locale]/community/**`, `scripts/seed-demo.ts` |
| 5.2 | **Averia as a seller.** It currently answers research questions. Make it able to: check a live lot, quote a price, check delivery to a country, and add to the cart. It becomes the difference no competitor can match overnight. | `lib/ai/tools/**` (20 tools) |
| 5.3 | **Partner programme.** `/partner` exists. Real institutional accounts (universities, clinics, labs) with net terms, bulk pricing and a dedicated line. B2B is where volume and margin live. | `app/[locale]/partner/page.tsx`, `lib/orders/quote.ts` |
| 5.4 | **Quote pipeline as a first-class funnel.** Today "Contact us before ordering" is a dead end. Make it a designed flow: request a lot → we confirm batch, purity and price → you accept → order. `quote_requests` and `api/quotes` already exist. **This is the honest path to revenue before stock exists.** | `app/api/quotes/route.ts`, `components/product/QuoteForm.tsx`, `app/[locale]/shop/[slug]/page.tsx` |
| 5.5 | **Mobile-first checkout.** One-page checkout, Apple/Google Pay, and a checkout that remembers the lab. | `components/checkout/CheckoutForm.tsx` (544 LOC today) |

---

## 6. The identity work (what "fun and professional" actually means)

The site should feel like a **laboratory that happens to sell things**, not a webshop with science in the footer. Concrete, buildable changes:

1. **A living lab, on the home page.** The ledger (already built) becomes the centrepiece: newest lots, real dates, real numbers, scrolling. It is the opposite of a promotional banner and it is un-copyable.
2. **Every measurement drawn, never just stated.** The quality chart already plots the assay against its limit. Extend it: heavy-metal panel, endotoxin on a log scale, purity trend across batches for one product.
3. **Motion with meaning.** The 3D vial exists. Make the hero react to the product you are looking at, and make the 3D scene interactive rather than decorative (rotate the vial, open it, see the lyophilisate). Not a gimmick — a "look inside" that supports trust.
4. **Typographic authority.** Crystal's site is a template: centred hero, four icon boxes, product grid. Ours should feel like a scientific publication that sells — real hierarchy, real footnotes, real citations — while staying warm and modern.
5. **Rewards as a game, not a ledger.** Crystal prints "Osta ja ansaitse 27 pistettä!". We can do better: a visible points balance, tiers with names, and points that unlock a real lab service (a free custom CoA, a priority lot review, an early access lot).
6. **The concierge as a character.** Averia should have a voice — Finnish, precise, warm, a little dry — and a visible presence on every product page, not a chat widget in the corner.
7. **Mobile-first, thumb-friendly.** Everything above has to work at 390 px. Our 3D is the risk; budget for a static hero on low-power devices.

---

## 7. Honest constraints (non-negotiable)

These are the rules the plan must not break, whatever the growth target:

1. **No certificate without a document.** A batch needs a real, openable CoA before it can be shown as released. The current `specificationsVerified` flag exists to enforce exactly this; the Phase 0 script must not bypass it.
2. **No fabricated purity.** A lot with no HPLC result must not print a number. This was already fixed once (`CertificateCard`, `StoreLedger`) — Phase 0 must not reintroduce it.
3. **No invented reviews.** Crystal shows "4.7/5 from 384 reviews". We have no review flow (`api/review-request` is a stub). Until there are real orders, we show nothing. When the flow exists, it must be a post-purchase request — `api/review-request` is the right place to build it.
4. **No fake urgency.** No invented countdown timers, no fake "37 people are viewing this", no permanent fake discount percentages. Volume discount and bundle saving are honest and mathematically real.
5. **Research-use framing stays.** Every page, every product, every email keeps the research-use-only line. It is legally load-bearing in the EU and it is part of the brand.
6. **Finnish is written by a Finnish speaker.** Machine-translated Finnish legal or safety text is a liability. New Finnish copy gets native review before it ships; until then it ships as English with an honest label.

---

## 8. Metrics

| Metric | Now | Target |
|---|---|---|
| Products listed | 15 | 40 |
| Products buyable | **0** | 40 (or 1 real lot proving the path) |
| Formats | vial | vial + capsule + spray |
| Blends / kits | 1 | 6 |
| Posts per product | 0 (no Sanity) | 1 long cited article, Finnish |
| Certificate entries | 1 (fixture) | every released lot, every assay |
| Price vs market on BPC-157 5 mg | +48 % | within ±10 % |
| Payment methods live | 0 | card + transfer + USDC |
| Newsletter subscribers | 0 | 500 |
| Community threads | 0 | 50 seeded technical threads |
| Countries served | FI (planned) | FI + EU, then NL/DE/SV native |

---

## 9. Recommended order — the next 10 working days

1. **Phase 0.1 + 0.2** — production catalogue activation + admin publish path. *(Code — can be built this week.)*
2. **Phase 0.3** — the PDP sellability checklist, so the current state reads as deliberate rather than broken. *(Code — this week.)*
3. **Phase 0.4** — the owner loads one real lot. *(Owner — needs the CoA.)*
4. **Phase 0.5** — Stripe keys, so the first real order can complete. *(Owner.)*
5. **Phase 1.1 + 1.2** — re-price and complete the size ladders. *(Code — after 0.1, because the seed reads the prices.)*
6. **Phase 5.4** — the quote funnel, designed properly, so inquiry is converted even before stock exists. *(Code — parallel.)*
7. **Phase 1.4** — volume discounts server-side. *(Code.)*
8. **Phase 4.1** — one flagship Finnish product article, cited, long. *(Content.)*

Everything above is deliverable in the existing stack: Next.js 15, Drizzle, Postgres + pgvector, next-intl, Zustand, Playwright, Vitest. No new frameworks, no new infrastructure.

---

## 10. Sources

- `https://crystalpeptides.fi` — rendered with Playwright (chromium 1.63), Finnish locale; `/`, `/shop`, `/product/bpc157`, `/coa`, `/sitemap.xml`, `/robots.txt`
- `https://corepeptides.com`, `https://corepeptides.com/peptides/`, `https://corepeptides.com/peptides/bpc-157/`
- `https://biotechpeptides.com`, `https://biotechpeptides.com/product-category/peptides/`
- `https://nordicpeptides.com`
- `https://averianlabs-demo.netlify.app/en`, `/en/shop`, `/en/shop/bpc-157`, `/api/health`
- Repository: `lib/products/data.ts`, `lib/products/catalogue.ts`, `lib/products/types.ts`, `db/seed.ts`, `db/schema/index.ts`, `scripts/seed-local-demo.ts`, `scripts/netlify-build.mjs`, `scripts/seed-checkout-test-product.ts`
- Prior internal analysis: `AverianLabs_kilpailijavertailu_ja_parannussuunnitelma_2026-10-11-2.md` (11 Oct 2026, Finnish) — its conclusion, that the differentiator is verifiable batch data rather than feature count, still holds and is the spine of this plan.
