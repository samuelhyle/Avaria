# Research customer reliability and usability plan

Date: 13 October 2026

## Objective

Make the existing storefront easier to use and dependable for laboratory customers. Product identity, batch evidence, prices, stock, payment status, documents and Finnish/English copy must agree throughout the customer journey. Preserve the existing Next.js, Drizzle and next-intl foundation and current work in progress.

This document is the implementation and verification ledger. A checkbox means the behavior has been implemented and checked; it does not substitute for supplier evidence, legal approval or a live-provider test.

## Baseline from the review

- Production build with local test configuration and TypeScript passed.
- Unit suite: 161 passed, 4 skipped.
- Browser suite: 54 passed, 2 failed, 5 skipped. The failures concern validation without an AI provider; database/provider journeys were not verified.
- All 60 tested Finnish/English routes returned HTTP 200; this does not establish business functionality.
- Translation keys were complete, but hardcoded English and a missing client namespace remain.
- Lint failed with 89 errors and 37 warnings, including formatting and existing code problems.
- Production dependency audit reported 21 advisory findings; assess reachability rather than equating advisories with demonstrated exploits.
- No working local PostgreSQL, merchant credentials or approved original reports were available during review.

## Execution order

### 1. Truthful public behavior and immediate usability

- [ ] Apply pending/verified/expired claim rules to all public trust surfaces.
- [ ] Replace unsupported customer statistics, accreditation and universal testing promises with neutral, localized wording.
- [ ] Build the public COA registry from real document records; never infer PASS or invent a report.
- [ ] Implement durable quote submission with honest success/error states and a delivery retry path.
- [ ] Remove unimplemented subscription controls and unsupported client-only discounts.
- [ ] Correct mobile header overflow and provide direct batch-document navigation.
- [ ] Complete typed quantity/unit rendering across product, cart, comparison and checkout.
- [ ] Share selected SKU/quantity between primary and sticky purchase controls.
- [ ] Supply the a11y client namespace and preserve query/hash state during language switching.

Acceptance: pending claims are hidden, success follows persistence, no 10 mL item is labeled 10 mg, and primary controls remain usable at 320/390/414 px.

### 2. Authoritative data and purchasing reliability

- [ ] Establish a database-backed storefront catalogue with an explicit unavailable/demo fallback rather than saleable static inventory.
- [ ] Align schema, forward migrations and seed, including typed units, purchase modes, product types and exact batch links.
- [ ] Capture batch identity and product/unit/price snapshots on order lines.
- [ ] Make one quote calculation authoritative for cart/checkout, shipping threshold, gross/net VAT and disabled discounts.
- [ ] Restrict launch destinations to the implemented Finland VAT policy until additional tax rules are approved.
- [ ] Add stable checkout attempt idempotency and parameter conflict checks.
- [ ] Make order state transitions, reservation consumption/release and stock restoration transactional and repeat-safe.
- [ ] Schedule reservation cleanup with authenticated cron access and handle delayed payment after expiry explicitly.
- [ ] Check amount/currency and provider references consistently; retain retryable webhook processing and email delivery.
- [ ] Show pending/failed/paid confirmations accurately, protect guest access and persist the customer's locale.
- [ ] Add a durable transactional email outbox, localized receipts and document links for the actual purchased batch.

Acceptance: concurrent purchase of the last unit, duplicate submissions, declined/canceled/expired payment, delayed success, replayed webhooks and email failure yield consistent stock and orders. A fresh database migrates and seeds without undocumented manual fixes.

### 3. Research content and Finnish/English completeness

- [ ] Inventory and localize all customer routes, emails, validation errors, empty states, dialogs and metadata.
- [ ] Use a terminology glossary: analyysitodistus (COA), erätunnus, näytepullo, liuotus; retain technical units such as EU/mg.
- [ ] Separate peptide, reagent, blend and supplies content; suppress inapplicable specifications rather than filling them with zero.
- [ ] Validate chemical identifiers, formula, mass, sequence, salt form and blend composition against owner-approved source records.
- [ ] Distinguish chromatographic purity, material content and identity evidence; report method and applicable units.
- [ ] Replace dosage/stack marketing with laboratory concentration, aliquot and compatibility information; remove generic IU assumptions.
- [ ] Fix document joins, locale selection, duplicate rows, combined filters and actual private/public file access behavior.
- [ ] Reconcile company identity, supported countries, shipping, tax, returns, retention and deletion copy with implemented behavior.
- [ ] Obtain human Finnish language and scientific review of the final approved content.

Acceptance: both languages cover the entire journey; product/batch/document data agree; no invented quality result or author credential is presented as fact. Independent scientific approval remains necessary where the repository has no source evidence.

### 4. Accessibility, performance, privacy and release checks

- [ ] Search by product name, SKU, CAS and batch ID; provide clear empty results and quote-only discovery.
- [ ] Prevent incomplete or empty checkout navigation and retain customer progress appropriately.
- [ ] Use a useful static homepage by default; make expensive 3D optional, honor reduced motion and recover without requestIdleCallback/WebGL.
- [ ] Fix interactive semantics, focus, text-link visibility and mobile scrolling; scan storefront content after the age gate.
- [ ] Suppress automatic newsletter interruption during checkout/account workflows.
- [ ] Add product-specific canonical/hreflang metadata and sitemap entries; noindex private purchase/account routes.
- [ ] Support reopening and revoking consent; align analytics loading with the stated policy.
- [ ] Make account deletion truthful, revoke deleted accounts' sessions and provide a verified cleanup mechanism.
- [ ] Fix relevant lint issues, compatible dependency advisories and useful per-route bundle budgets.
- [ ] Run production build, TypeScript, lint, units, database integration, FI/EN browser and accessibility checks.

Acceptance: no critical/serious accessibility errors in the actual FI/EN storefront or checkout; no horizontal overflow; no hidden critical test skips. Target WCAG 2.2 AA and field LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1. Measure actual responsiveness, not work moved outside an audit window.

## Inputs that cannot be invented in code

| Input | Responsible owner | Consequence until supplied |
| --- | --- | --- |
| Original COAs, test methods, accreditation certificates and supplier audit evidence | Quality/scientific owner | Claims remain pending; unavailable reports are labeled honestly. |
| Approved chemical identity and product-specific specifications | Scientific owner | Unsupported fields are omitted and release approval remains pending. |
| Registered company name, Business ID, VAT ID and contact address | Business owner | Production legal readiness check must fail instead of publishing fictional details. |
| Buyer eligibility, countries, VAT/shipping/returns policy | Operations/finance/legal owner | Use only supported policy and describe it accurately; additional markets stay disabled. |
| PostgreSQL, storage and payment/email sandbox credentials | Engineering/operations | Local integration checks require an isolated test database; live delivery/merchant tests remain pending. |
| Human Finnish/English scientific editorial approval | Content/scientific owner | Automated localization checks do not certify scientific or legal correctness. |

## Verification and delivery ledger

Implementation has started. Record concrete changes, executed checks and remaining external requirements here before completion. Do not mark unexecuted provider checks as passed.

## References

- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Vero: intra-community trade](https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/vat/international-commerce/intra-community-trade/)
- [W3C: understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
