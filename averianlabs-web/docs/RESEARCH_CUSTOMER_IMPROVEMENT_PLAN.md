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

- [x] Apply pending/verified/expired claim rules to all public trust surfaces.
- [x] Replace unsupported customer statistics, accreditation and universal testing promises with neutral, localized wording.
- [x] Build the public COA registry from real document records; never infer PASS or invent a report.
- [x] Implement durable quote submission with honest success/error states and a delivery retry path.
- [x] Remove unimplemented subscription controls and unsupported client-only discounts.
- [x] Correct mobile header overflow and provide direct batch-document navigation.
- [x] Complete typed quantity/unit rendering across product, cart, comparison and checkout.
- [x] Share selected SKU/quantity between primary and sticky purchase controls.
- [x] Supply the a11y client namespace and preserve query/hash state during language switching.

Acceptance: pending claims are hidden, success follows persistence, no 10 mL item is labeled 10 mg, and primary controls remain usable at 320/390/414 px.

### 2. Authoritative data and purchasing reliability

- [x] Establish a database-backed storefront catalogue with an explicit unavailable/demo fallback rather than saleable static inventory.
- [x] Align schema, forward migrations and seed, including typed units, purchase modes, product types and exact batch links.
- [x] Capture batch identity and product/unit/price snapshots on order lines.
- [x] Make one quote calculation authoritative for cart/checkout, shipping threshold, gross/net VAT and disabled discounts.
- [x] Restrict launch destinations to the implemented Finland VAT policy until additional tax rules are approved.
- [x] Add stable checkout attempt idempotency and parameter conflict checks.
- [x] Make order state transitions, reservation consumption/release and stock restoration transactional and repeat-safe.
- [x] Schedule reservation cleanup with authenticated cron access and handle delayed payment after expiry explicitly.
- [x] Check amount/currency and provider references consistently; retain retryable webhook processing and email delivery.
- [x] Show pending/failed/paid confirmations accurately, protect guest access and persist the customer's locale.
- [x] Add a durable transactional email outbox, localized receipts and document links for the actual purchased batch.

Acceptance: concurrent purchase of the last unit, duplicate submissions, declined/canceled/expired payment, delayed success, replayed webhooks and email failure yield consistent stock and orders. A fresh database migrates and seeds without undocumented manual fixes.

### 3. Research content and Finnish/English completeness

- [x] Inventory and localize all customer routes, emails, validation errors, empty states, dialogs and metadata.
- [x] Use a terminology glossary: analyysitodistus (COA), erätunnus, näytepullo, liuotus; retain technical units such as EU/mg.
- [x] Separate peptide, reagent, blend and supplies content; suppress inapplicable specifications rather than filling them with zero.
- [ ] Validate chemical identifiers, formula, mass, sequence, salt form and blend composition against owner-approved source records.
- [x] Distinguish chromatographic purity, material content and identity evidence; report method and applicable units.
- [x] Replace dosage/stack marketing with laboratory concentration, aliquot and compatibility information; remove generic IU assumptions.
- [x] Fix document joins, locale selection, duplicate rows, combined filters and actual private/public file access behavior.
- [x] Reconcile company identity, supported countries, shipping, tax, returns, retention and deletion copy with implemented behavior.
- [ ] Obtain human Finnish and English language and scientific review of the final approved content.

Acceptance: both languages cover the entire journey; product/batch/document data agree; no invented quality result or author credential is presented as fact. Independent scientific approval remains necessary where the repository has no source evidence.

### 4. Accessibility, performance, privacy and release checks

- [x] Search by product name, SKU, CAS and batch ID; provide clear empty results and quote-only discovery.
- [x] Prevent incomplete or empty checkout navigation and retain customer progress appropriately.
- [x] Use a useful static homepage by default; make expensive 3D optional, honor reduced motion and recover without requestIdleCallback/WebGL.
- [x] Fix interactive semantics, focus, text-link visibility and mobile scrolling; scan storefront content after the age gate.
- [x] Suppress automatic newsletter interruption during checkout/account workflows.
- [x] Add product-specific canonical/hreflang metadata and sitemap entries; noindex private purchase/account routes.
- [x] Support reopening and revoking consent; align analytics loading with the stated policy.
- [x] Make account deletion truthful, revoke deleted accounts' sessions and provide a verified cleanup mechanism.
- [x] Fix relevant lint issues, compatible dependency advisories and useful per-route bundle budgets.
- [x] Run production build, TypeScript, lint, units, database integration, FI/EN browser and accessibility checks.

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

The four code phases have been implemented. Original supplier evidence, actual merchant operation and human editorial approval remain external release requirements. See [the release and operations runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md) for exact supported behavior and setup.

### Delivered behavior

- Product, SKU, unit, stock and reviewed batch/document data come from the database. Reference data cannot establish stock, saleability, purity, chemical identity or author credentials. Original reports and methods are shown without an inferred PASS or accreditation claim.
- Main and sticky purchase controls share SKU/quantity. Mass and volume remain distinct across product/cart/checkout/compare/AI context; SI label case and spacing are retained. Unavailable products have a persisted quotation path.
- One gross-price quote includes Finland VAT and shipping. Stable checkout attempts, exact batch snapshots, locked reservations, repeat-safe payment transitions and authenticated maintenance protect stock and order consistency. Cryptocurrency creation remains disabled pending provider reliability.
- Payment confirmation shows actual pending/paid/failed/review/refunded state through protected guest access. Retryable email outbox records retain quotations, support messages and receipts when delivery is unavailable. Receipt documents point to the purchased batch.
- Finnish/English customer copy, errors, empty states, emails, metadata, social previews and installable-app descriptions use supported behavior. Universal testing, invented endorsements, instant email delivery, monthly newsletter and restoration-period promises have been removed.
- Concentration/aliquot calculation uses finite laboratory quantities and scientific units. Customer-facing dosage/stack/IU assumptions are removed. Assistant injection/PII/medical-bypass checks stop recognised prohibited instructions before the model call and return Finnish refusals when selected.
- The homepage has useful static content and optional 3D. Reveal animations leave server HTML visible without JavaScript. Reduced motion and missing browser APIs recover safely; navigation preserves filters/hash and supports keyboard focus at narrow widths.
- Consent can be reopened/revoked; optional analytics wait for acceptance and exclude private routes. Account deletion revokes sessions and removes private content; the disabled shell is purged after 30 days. Revoked plan shares disappear from pages, images and activity feeds immediately.
- CI covers lint/types/localization/unit/database/browser checks and per-route initial JavaScript budgets. Missing legal/provider inputs and test fixtures make release checks fail. Dependency updates reduce production advisories to one moderate finding; the optional local embedding runtime has a tested Intel Mac compatibility pin.

### Executed verification

Verification used an isolated PostgreSQL database and a local production build. Browser fixtures were explicitly labeled test data; Stripe intent creation and email delivery were mocked in database integration tests. No customer email or real payment was sent. Local fixtures and provider mocks are not production supplier evidence.

| Check | Result | Scope and limits |
| --- | --- | --- |
| Production build and TypeScript | Passed | Next.js 15.5.27, Node 22.20.0; local configuration with external providers disabled. |
| Lint | Passed, 0 errors and 52 warnings | Remaining warnings include non-null assertions and structured-data HTML; this is not a warning-free result. |
| Unit tests | 175 passed, 0 skipped | Includes four enabled native embedding/model tests on this Intel Mac. |
| Database integration | 18 passed, 0 skipped | Stock concurrency, checkout replay/conflicts, signed webhook validation, late payments, outbox retries, private documents, token consumption, deletion and share revocation. Providers are mocked. |
| Full Chromium browser suite | 100 passed, 2 skipped of 102 | FI/EN storefront, typed units, narrow layouts, populated checkout, auth failure/recovery, sharing and consent. The two skips require the live AI provider. |
| Accessibility | 20 standalone FI/EN routes passed; 20 browser accessibility cases passed | No critical/serious findings. Standalone checks also reported zero minor violations. Includes populated checkout; automated findings do not certify WCAG conformance or screen-reader usability. |
| Translation parity and literal usage | 1,057 leaf keys across five locales, 0 missing; usage check passed | FI/EN customer copy revised. Key coverage does not certify human scientific/editorial correctness; DE/SV/NL fallback copy awaits review. |
| Route gzip budgets | All five passed | Home 283.7 KiB, catalogue 277.8, product 293.1, cart 271.7, payment 276.0. Initial declared route dependencies; optional chunks are measured separately. |
| Production dependency audit | 0 high/critical; 1 moderate | Remaining `sprintf-js` precision-specifier denial-of-service advisory in the local embedding dependency chain has no fixed version reported by the audit. Reachability has not been proved absent. |
| Legal and release prerequisites | Intentionally blocked | Six seller identity settings, actual providers, HTTPS target and an approved saleable catalogue remain required. Verification fixtures are removed after the run. |

Final simulated mobile Lighthouse results (one local run per route, essential consent, age gate satisfied):

| Route | Performance / 100 | LCP | Total blocking time | CLS |
| --- | --- | --- | --- | --- |
| English homepage | 96 | 1,664 ms | 222 ms | 0 |
| Finnish homepage | 89 | 1,179 ms | 446 ms | 0 |
| English catalogue | 91 | 1,379 ms | 385 ms | 0 |
| Finnish catalogue | 89 | 944 ms | 437 ms | 0 |

These are laboratory measurements, not production field Core Web Vitals. Total blocking time is not INP. Lighthouse did not return an accessibility score; the independent axe/browser checks above supply the reported automated accessibility results. Profile hydration and unused JavaScript before making a field responsiveness claim.

Artifacts: [verification record](verification/research-storefront-2026-10-13/verification.json), [route bundle report](verification/research-storefront-2026-10-13/bundle.json), [mobile Lighthouse report](verification/research-storefront-2026-10-13/mobile-lighthouse.json), [Finnish mobile screenshot](verification/research-storefront-2026-10-13/fi-390-above-fold.png) and [Finnish desktop screenshot](verification/research-storefront-2026-10-13/fi-1440-above-fold.png). Full-page Finnish screenshots cover 320/390/414/768/1280 px. Screenshots reflect the isolated review database, including clearly named test fixtures where visible.

The production build was checked locally; this work did not deploy or configure real provider accounts. Temporary review infrastructure is stopped after verification. Re-run the release runbook with approved records and the actual target configuration before accepting customer orders.

### Release requirements still outstanding

1. Obtain scientific source approval for each SKU, its identifiers/specifications, exact released batch, original report, method, units and report availability. Pending claims remain hidden and unreleased reference records remain quotation-only.
2. Supply the registered seller identity and approve buyer eligibility, Finland VAT/shipping/returns/retention policies. The legal check currently fails on six missing identity settings; no fictional values were introduced to make it pass.
3. Configure actual storage, card/email sandbox accounts, verified sender and authenticated scheduler. Complete real successful/declined/3DS/refund payment, carrier, expiring-document and email-delivery rehearsals in the runbook. Local provider mocks do not certify these services.
4. Have a human scientific editor approve the final Finnish and English content and original reports. German/Swedish/Dutch key parity is automated; new fallback content in those languages has not had editorial approval.
5. Activate the maintenance workflow only after the correct target URL and secret are configured. It is implemented in the repository; this work did not configure a production scheduler or deploy the site.

### Next improvement order after approval

1. Release a small, approved catalogue with complete batch reports; perform merchant sandbox and fulfilment rehearsals before enabling real customer orders.
2. Establish immutable report versions/object keys and recorded file hashes, an operator workflow for `payment_review`, and backup/restore rehearsal. Review operational-message and order-data retention.
3. Test product discovery, batch verification, quotation and checkout with Finnish/English laboratory buyers, including keyboard/screen-reader users. Shorten wording or layout where observed customer friction remains.
4. Profile Finnish catalogue hydration on actual target devices, then measure consent-respecting field LCP/INP/CLS. The lab report is a diagnostic; it cannot certify field responsiveness.
5. Add validated additional-country tax/shipping support and purchasing features only after operations approve them. Before any marketing campaign, implement a signed unsubscribe route and its message link; subscriptions, loyalty discounts, cart marketing and public product reviews stay disabled until their actual workflows exist.

## References

- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Vero: intra-community trade](https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/vat/international-commerce/intra-community-trade/)
- [W3C: understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
