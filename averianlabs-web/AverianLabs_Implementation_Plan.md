# AverianLabs — Website Improvement and Implementation Plan

**Date:** 11 October 2026
**Status:** Proposed implementation backlog; no changes deployed
**Reviewed site:** https://averianlabs-demo.netlify.app/fi
**Objective:** Turn the existing demo into a credible, maintainable, privacy-focused research-product store with dependable catalogue data, documentation, checkout and fulfilment.

---

## 0. Executive summary and blocking decisions

### TL;DR

The current demo cannot accept production orders as it stands. Seven P0 defects (CAT-01, DATA-01, DOC-01, ORG-01, UNIT-01, USE-01, CLAIM-01) block trust, and at least one P1 (PAY-01) blocks the literal checkout button. All P0 and P1 work can complete in **roughly 4–7 weeks** with one experienced developer plus design, content and operational support, **assuming the three blocking decisions below are made first**. Product classification, original evidence and provider approval may extend calendar time beyond that.

### Three blocking decisions before Day 1

| # | Decision | Why it blocks | Default if deferred |
| - | -------- | ------------- | ------------------- |
| D1 | Sales model: B2B-only, restricted B2C-permitted, or hybrid | Determines §4's eligibility matrix, §7's checkout rules, and §10's terms | Treat as B2B-only; expand later |
| D2 | Payment mix: Stripe (fiat) + Coinbase Commerce (crypto); BTCPay deferred to a post-launch phase | Determines §7's architecture, fee-vs-order-value trade-off, and which checkout copy is honest | Stripe on; Coinbase Commerce on; BTCPay out of current scope |
| D3 | Eligibility geography: which destination countries and buyer categories are accepted per SKU | Determines §4's restriction matrix and §7's pre-payment validation | EU business buyers only; expand on documented evidence |

### Headline calendar

- **Week 0 (this document):** Decisions D1–D3 confirmed.
- **Weeks 1–2:** Phase 1 + Phase 2 (evidence, catalogue, units, documents).
- **Weeks 2–4:** Phase 3 (checkout, payments, fulfilment, portal).
- **Weeks 4–6:** Phase 4 (navigation, polish, localisation, accessibility, editorial).
- **Weeks 6–7:** Phase 5 (verification, restore/rollback, controlled pilot).
- **External approvals** may add 1–4 weeks; do not assume parallel completion.

---

## 1. Scope and evidence

This plan consolidates the public-site review performed on 11 October 2026. The review covered the Finnish homepage, all 15 linked product pages, six research articles, and the main quality, documentation, support, community and policy pages.

It was not a source-code review, penetration test or completed checkout test. The age-confirmation overlay limited interactive testing. No age declaration, account registration, purchase or payment was submitted. Mobile layouts, backend integrations, laboratory reports and actual inventory were not independently verified. Blank content observed during initial navigation sometimes loaded subsequently; those loading observations are not classified as broken pages.

**Priorities:**

- **P0:** Resolve before accepting production orders.
- **P1:** Complete before public launch.
- **P2:** Add after the core purchasing journey is proven.

**Suggested owners:** product owner, developer, scientific/quality lead, operations lead, and qualified legal/accounting advisers. One person may cover multiple roles, but each task needs a named accountable owner. RACI per workstream appears in §4–§10.

---

## 2. Recommended launch scope

Retain the existing brand and Next.js frontend. Keep Netlify initially while assessing the repository and actual processing locations. Use an EU-hosted order backend, private PostgreSQL database and a separate payment service if required.

**Launch with:**

- Catalogue, product variants and accurate availability.
- Searchable batch verification and original documents.
- Eligible-buyer checkout, payment status and receipts.
- Order tracking, support and institutional enquiries.
- Verified company information and applicable policies.
- Fully reviewed languages only; prioritise Finnish and English.

**Defer behind feature flags:**

- Rewards, referrals and automatic subscriptions.
- Empty community and glossary sections.
- AI research advice until its sources and behaviour are evaluated.
- Additional incomplete translations.
- Automatically loaded 3D browsing experiences.

The proposed research-business purchasing model must be confirmed against actual product eligibility (§4). This plan does not determine the legal classification of any SKU.

---

## 3. Confirmed findings and repair backlog

### Critical defects

| ID | Priority | Observed finding | Implementation task | Acceptance criterion |
| -- | -------- | ---------------- | -------------------- | -------------------- |
| CAT-01 | P0 | AOD-9604 is quotation-only, appears at €0 in bundles and has a sticky add-to-cart control. | Introduce an explicit purchase mode and enforce it in every UI and backend path. | A quotation-only variant cannot create a payable order, subscription or bundle line without an approved quote. Missing price never becomes zero. |
| DATA-01 | P0 | Product-page purity differs from the COA registry for the same batch. | Store test results against batch IDs and render every surface from that record. | Product, catalogue and batch-registry values match the approved original report. |
| DOC-01 | P0 | Documents page says "Ei dokumentteja" despite repeated certificate promises. | Upload verified originals; associate documents with released batches. | Every saleable batch has its required documents and working links. |
| ORG-01 | P0 | Business ID, VAT ID and address contain placeholders. | Replace with verified company details across all templates. | No placeholder company information remains. |
| UNIT-01 | P0 | BAC water is represented as 10 mg, while other text describes 10 mL. | Verify the specification and use typed mass/volume quantities. | Correct units appear in catalogue, cart, documents, calculator and receipt. |
| USE-01 | P0 | Research-only positioning conflicts with product-linked dose defaults, syringe imagery and weekly dosing schedules. | Review intended-use presentation and product eligibility; restrict tools to substantiated laboratory uses. | Scientific and regulatory reviewers approve the published flow and content. |
| CLAIM-01 | P0 | Accreditation, testing, supplier audits and institution-count claims lack verified evidence in this review. | Create a claim-to-evidence register; remove claims until substantiated. | Every published objective claim has a current evidence owner and source. |
| I18N-01 | P1 | Finnish pages contain English copy, raw translation keys and missing-message console errors. | Complete translation dictionaries and interpolation handling. | No raw keys, accidental English fallback or missing-message errors in supported locales. |
| FORMAT-01 | P1 | Purity uses doubled percent signs; KLOW shows "Low · {count} left." | Centralise locale-aware number, unit and stock formatting. | Formatting is consistent and stock placeholders interpolate correctly. |
| SHIP-01 | P1 | 24-hour dispatch and 24-hour delivery are used inconsistently. | Define dispatch cutoff and destination-specific carrier estimates. | All surfaces distinguish dispatch from transit time. |
| PAY-01 | P1 | Payment logos and "Stripe-secured" are shown; live integrations were not verified. | Inventory approved and tested methods. | Only usable methods appear in checkout, footer and policies. |
| EDIT-01 | P1 | Articles labelled 6–12-minute, citation-backed essays contain very short text without the promised references. | Complete scientific review and citations or unpublish unfinished articles. | Reading times reflect actual text; claims have checked references. |
| TYPE-01 | P1 | Shared peptide templates are applied to BAC water and other reagent types. | Add type-specific specifications, packaging contents and document requirements. | Water is not described as a peptide or given irrelevant fields. |
| META-01 | P2 | Meta titles, descriptions and OG tags vary between pages and locales. | Add automated SEO lint to CI. | Each public page has a unique, locale-correct meta description. |
| PERF-01 | P2 | Lighthouse budgets not enforced; 3D viewer loads eagerly. | Add bundle and runtime budgets; gate deploys on regressions. | Performance budgets hold on the demo and staging URLs. |

### Examples requiring reconciliation, not arbitrary selection of one figure

| Batch | Product page | COA registry |
| ----- | -----------: | -----------: |
| RETA-2026-07-A | 98.7% | 98.9% |
| GHK-2026-08-A | 99.5% | 99.6% |
| BPC-2026-07-A | 99.2% | 99.4% |

---

## 4. Workstream A — Product eligibility and evidence

**Owner:** product owner with scientific/quality and regulatory reviewers.
**Dependency:** none (must start first; unblocks §5, §7, §8, §10).
**Gate:** approved saleable catalogue and claims register. Commercial privacy must coexist with any necessary buyer verification; do not promise anonymous institutional verification.

### Decision: B2B-only vs B2C-permitted (D1)

| Dimension | B2B-only | Restricted B2C | Recommendation |
| --------- | -------- | -------------- | -------------- |
| Buyer proof | VAT ID + business email | Age, ID, jurisdiction | Confirm D1 before §5 schemas |
| Refunds | Per contract | Per consumer law | Match D1 |
| Marketing claims | Institutional | Use restrictions prominent | Match D1 |
| Default | ✓ | only with documented eligibility | Start with B2B-only |

### Tasks

- [ ] Establish whether sales are B2B-only, or whether any approved B2C model is intended.
- [ ] Record product classification, permitted buyer categories and destination countries per SKU.
- [ ] Confirm required licences, supply restrictions, labelling and handling documentation where applicable.
- [ ] Verify supplier identities, original laboratory reports and accreditation scope where claimed.
- [ ] Validate product identity, quantity, composition, storage requirements and expiry/retest basis.
- [ ] Define customer eligibility checks proportionate to the actual supply model.
- [ ] Exclude ineligible or unresolved product/destination combinations before payment creation.
- [ ] Publish only substantiated claims; research-use disclaimers are not classification evidence.

---

## 5. Workstream B — Catalogue, batches and documents

**Owner:** developer and quality lead.
**Dependency:** §4 evidence approved.
**Gate:** no contradictions across pages; every released batch has its required original evidence. Do not create substitute laboratory certificates to fill missing files.

### Minimum data model

| Record | Main fields and rules |
| ------ | --------------------- |
| Product | Name, slug, type, identifiers, approved description, eligibility rules |
| Variant | SKU, typed quantity/unit, package contents, purchase mode, price/currency, tax category |
| Batch | Batch reference, variant association, dates, release status, storage and available inventory |
| Test result | Batch ID, method, result, unit, specification, laboratory and source report |
| Document | Batch/product association, type, original file, version, checksum and approval status |
| Order line | Immutable commercial snapshot plus actual allocated/dispatched batch |
| Inventory reservation | Variant/batch, quantity, expiry and order reference |

### Typed units

- Use `Mass` (mg, g, µg) for peptide actives; reject volume in peptide templates.
- Use `Volume` (mL, µL) for solvents and diluents; reject mass in water templates.
- Use `Count` (vials, ampoules, kits) for packaged goods; tie to inventory reservation.
- Reject template code that would convert "10 mL" to "10 mg" via fallback strings.

### Purchase modes

- `direct purchase` — payable via standard checkout.
- `quotation required` — never payable; produces an enquiry, not an order.
- `unavailable` — visible for context, not buyable.

### Tasks

- [ ] Use nullable/unset prices for quotation-only items, never a zero-price fallback.
- [ ] Define explicit modes: direct purchase, quotation required, unavailable.
- [ ] Enforce modes server-side for normal cart, bundles, quick-add and repeat orders.
- [ ] Separate mass, volume and count; reject incompatible units.
- [ ] Use source-backed fields rather than filling unknown values with plausible text.
- [ ] Represent blend component quantities explicitly.
- [ ] Make certificate status depend on an approved document association.
- [ ] Provide batch lookup from vial identifiers and optional label QR codes.
- [ ] Preserve document versions and retain the version relevant to a fulfilled order.
- [ ] Support quarantine, release, withdrawal and recall status.
- [ ] Link customer shipments to actual batches for targeted recall handling.

---

## 6. Workstream C — Navigation and visual refinement

**Owner:** designer/frontend developer.
**Dependency:** §5 schemas stable enough for product-page redesign.
**Gate:** desktop and mobile layouts are reviewed with real content; the primary journey remains usable without animation or 3D.

### Primary navigation

Products, Batch verification, Quality, Support, Company. Keep search, language and cart accessible; move secondary resources into a submenu.

### Homepage sequence

1. Clear supplier proposition and intended customer type.
2. Browse products and verify a batch actions.
3. Compact product selection.
4. Evidence of testing and traceability.
5. Accurate dispatch, delivery and support information.
6. Institutional enquiry option.

### Product-page sequence

Identity → variant/price → batch evidence → handling and documents → purchase → support. The actual shipped batch must be disclosed accurately; do not promise a particular batch without reservation logic.

### Design tokens

- One typography scale, spacing system, button hierarchy and icon treatment.
- Use accurate product and label photography; identify illustrative renders.
- Respect `prefers-reduced-motion`; do not animate scientific measurements.

### Tasks

- [ ] Remove duplicate newsletter forms and unfinished promotional sections.
- [ ] Remove unverified social proof, scarcity and popularity claims.
- [ ] Adopt one typography scale, spacing system, button hierarchy and icon treatment.
- [ ] Use accurate product and label photography; identify illustrative renders.
- [ ] Load 3D only after user interaction and provide a static fallback.
- [ ] Avoid count-up animation for scientific measurements.
- [ ] Respect reduced-motion preferences.
- [ ] Give product pages one primary purchase action with accurate availability.
- [ ] Make sticky purchase controls obey the same state as the main panel.
- [ ] Use a complete, compact footer with one copyright statement.

---

## 7. Workstream D — Checkout, payments and private support

**Owner:** backend developer and operations lead.
**Dependency:** §5 saleable catalogue and §4 eligibility matrix.
**Gate:** staging verifies a complete order, exception handling and refund workflow without exposing keys or personal data.

### Recommended flow

1. Validate buyer eligibility, destination, stock, price, tax and shipping on the server.
2. Reserve inventory for a defined period.
3. Create an unpaid order confirmation and private order-access mechanism.
4. Create a payment invoice with exact currency/network, amount, address, QR code and expiry.
5. Detect and independently verify payment on the server.
6. Mark paid only after the configured confirmation requirement.
7. Issue a receipt and release fulfilment.
8. Record dispatched batch, tracking and delivery status.

Maintain separate order, payment and fulfilment states. Payment exceptions must not silently advance fulfilment.

### Payment state machine

| Case | Required behaviour |
| ---- | ------------------ |
| Pending payment | Show amount, expiry and clear waiting status. |
| Detected payment | Show confirmation progress; do not represent it as final settlement. |
| Confirmed payment | Issue receipt and enqueue fulfilment once. |
| Underpayment/overpayment | Record exact amount and enter a controlled resolution flow. |
| Expired or late payment | Reconcile funds; recheck stock and price before fulfilment. |
| Duplicate notification | No duplicate receipt, stock deduction or shipment. |
| Missed notification/outage | Scheduled reconciliation recovers the correct state. |
| Refund | Authenticate request, verify destination and require authorized signing. |

### Payment method matrix (D2)

| Method | Typical use | Fee profile | Confirmation | Default for |
| ------ | ----------- | ----------- | ------------ | ----------- |
| Stripe (fiat) | All fiat-paying orders, B2B VAT-eligible buyers, B2C cards | ~1.5–3% | Instant to 2 days | Default fiat payment |
| Coinbase Commerce (crypto) | Buyers preferring on-chain or stablecoin settlement | Network + ~1% processing | Minutes to hours | Crypto payment, opt-in at checkout |

**Default policy:** Stripe is the default for any order not explicitly choosing crypto. Coinbase Commerce is shown as a crypto option at checkout when the API key is configured. EUR is the order currency regardless of payment method; Coinbase Commerce's `local_price` is set to EUR (`local_price.amount` derived from `totalCents/100`). A future BTCPay migration is described in the deferred subsection below.

### Payment architecture (Stripe + Coinbase Commerce)

- [ ] Stripe PaymentIntents are created server-side with `automatic_payment_methods.enabled = true` and an `idempotencyKey` set to `order.id` so retries are safe.
- [ ] Coinbase Commerce charges are created server-side against `https://api.commerce.coinbase.com/charges` with `pricing_type: "fixed_price"`, `local_price` in EUR, and `metadata` carrying `orderId` and `orderNumber`.
- [ ] The webhook signature is `x-cc-webhook-signature`, validated with HMAC SHA256 using `COINBASE_COMMERCE_WEBHOOK_SECRET` and `crypto.timingSafeEqual`.
- [ ] Webhook events are persisted in the `webhook_events` table (primary key `{provider}:{eventId}`) with `onConflictDoNothing` so at-least-once delivery is processed exactly once.
- [ ] On `charge:confirmed`, mark the order paid, store `cryptoChargeId` and `cryptoTxHash`, and send the order confirmation email exactly once.
- On `charge:failed`, restore the stock reservation.
- [ ] On any handler exception, delete the idempotency row so the provider can retry on the next delivery.
- [ ] Order status state machine (separate `pending → paid → refunded` and `pending → failed`) is enforced server-side; the Stripe / Coinbase branch only runs after eligibility, destination, stock, price and VAT checks pass.
- [ ] EUR commercial totals and the recorded exchange rate at confirmation time are kept for accounting review (§10).
- [ ] No seeds, no spending keys, no private wallet material are ever stored in the web app, repository, logs or chat.

### Deferred: BTCPay migration (post-launch)

A future phase may replace Coinbase Commerce with BTCPay to gain watch-only custody, Lightning settlement, and self-hosted invoicing. If pursued:

- Deploy BTCPay Server on EU-hosted infrastructure with a separate hardware-wallet watch-only configuration.
- Generate a unique invoice derivation path per order and verify on the server before displaying the address.
- Treat public xpub information as commercially sensitive even though it cannot spend funds.
- Evaluate Lightning fees against the smallest stock-keeping unit before making Lightning the only crypto rail.
- Re-test all webhook idempotency paths because BTCPay's event payload schema differs from Coinbase's.

Until that work is scheduled and resourced, Coinbase Commerce remains the only crypto path.

### Messaging and access

- [ ] Publish official Signal contact links; add other channels only if operationally needed.
- [ ] Keep messaging optional and payment instructions on the trusted order page.
- [ ] Support staff must not replace payment addresses through chat.
- [ ] Use high-entropy order-access credentials, protected sessions and an explicit recovery flow.
- [ ] Keep private access links out of analytics, referrers and support messages.
- [ ] Treat order references as identifiers, not authorization to view addresses or issue refunds.

### Subscriptions

Defer automatic recurring purchase claims. Cold-wallet payments cannot automatically debit a customer. A first release can use reorder reminders and a fresh payment invoice. Never promise indefinite reservation of the current batch without inventory and expiry support.

---

## 8. Workstream E — Fulfilment and customer service

**Owner:** operations lead.
**Dependency:** §5 inventory model, §7 paid order events.
**Gate:** a controlled pilot shipment can be traced from order through batch, carrier and support resolution.

- [ ] Define dispatch cutoffs using Europe/Helsinki local time and business-day calendars.
- [ ] Separate dispatch promises from carrier transit estimates.
- [ ] Confirm shipping methods and destination eligibility per product.
- [ ] Specify product-dependent packaging and validated transport conditions.
- [ ] Publish temperature-log claims only where the actual service supplies them.
- [ ] Establish handling for temperature excursions, loss, damage and delivery failure.
- [ ] Record batch and quantity during packing; prevent quarantined stock from shipping.
- [ ] Provide accurate parcel contents and tracking updates.
- [ ] Define support hours, ownership and escalation rules.
- [ ] Separate return requests, quality complaints and statutory remedies as applicable.

---

## 9. Workstream F — Hosting, security and deployment

**Owner:** developer/operations administrator.
**Dependency:** §7 stack choices; runs in parallel with §5 and §8.
**Gate:** deployment, rollback, restore and incident procedures are documented and demonstrated.

First inventory the repository, framework versions, databases, authentication, email, CMS, analytics and payment integrations. Next.js assets were observed; provider names in policy text are not proof of active configuration.

### Proposed components

| Component | Direction |
| --------- | --------- |
| Frontend | Existing Next.js/Netlify deployment initially |
| Order API and jobs | EU-hosted application with an assigned maintenance owner |
| Database | Private PostgreSQL with encrypted backups and restore tests |
| Payment service | Stripe + Coinbase Commerce (live); BTCPay is deferred to a post-launch phase |
| Documents | Versioned storage with clear public/private access boundaries |
| Administration | Role-based access, MFA and audit history |
| Wallet signing | Offline hardware wallet under authorized custody |

### Tasks

- [ ] Separate production and staging credentials, databases and payment settings.
- [ ] Remove demo fixtures from production; prevent seed scripts from running there.
- [ ] Keep databases private and service permissions narrowly scoped.
- [ ] Protect sessions, validate input and enforce per-order authorization.
- [ ] Apply rate limits to login, order lookup, invoice creation and support endpoints.
- [ ] Review CSP, framing, referrer, caching and transport-security headers.
- [ ] Keep customer pages and private documents out of public caches.
- [ ] Patch dependencies and assign incident-response ownership.
- [ ] Monitor application errors, payment synchronization, inventory exceptions and backups.
- [ ] Redact tokens, addresses and sensitive request content from logs.
- [ ] Verify backup restoration and deployment rollback.
- [ ] Configure the production domain and appropriate email authentication.

### Rollback runbook (Phase 5 deliverable)

- [ ] Document the rollback procedure as a versioned runbook before Phase 5 begins.
- [ ] Demonstrate: revert code, revert database migrations, preserve order and payment integrity, recover orphaned invoices, restore payment-node state, restore backups from cold storage, and reissue lost receipts.
- [ ] Tie the runbook to a tested recovery-time objective (RTO) and recovery-point objective (RPO).

Move the storefront only for a documented benefit: processing-location requirements, operating cost or application compatibility. EU hosting alone does not prove that analytics, email, support or backups remain in the EU.

---

## 10. Workstream G — Policies, localisation and editorial quality

**Owner:** content lead with qualified reviewers.
**Dependency:** §4 sales model, §7 payment mix.
**Gate:** reviewers approve complete customer-facing content in every launch language.

- [ ] Align terms with the actual B2B/B2C model, including delivery risk, returns, liability and dispute provisions.
- [ ] Implement applicable VAT rules; a valid VAT ID is not a universal VAT exemption.
- [ ] Replace placeholder company details and unsupported compliance badges.
- [ ] Map actual personal-data flows, processors, locations and retention categories.
- [ ] Reconcile analytics providers named in privacy and cookie policies.
- [ ] Provide a working consent-preferences control and test consent withdrawal.
- [ ] Confirm whether a formally named DPO and all published contact addresses are appropriate and operational.
- [ ] Review outdated legal references and policy dates.
- [ ] Translate all visible UI, errors, emails, receipts and documents needed for each launch language.
- [ ] Add automated missing-key and placeholder checks.
- [ ] Scientifically review articles, citations, terminology and product specifications.
- [ ] Compute reading times from actual article text.
- [ ] Remove unfinished articles, empty glossary links and empty community promotion from launch navigation.
- [ ] Keep internal moderation details out of customer copy.
- [ ] Restrict AI support to approved sources and evaluate unsupported-answer and medical-advice handling before release.
- [ ] If any AI advice was previously indexed by third-party search engines, file removal requests and serve `noindex` on residual URLs until the page is removed.

---

## 11. Quality assurance and release criteria

The following are proposed targets, not measured results from the public-site review.

### Correctness

- [ ] Quote-only products cannot bypass restrictions through bundles, sticky controls, direct requests or repeat orders.
- [ ] Client-side price manipulation cannot change the server-calculated payable total.
- [ ] Concurrent orders cannot oversell the last available unit.
- [ ] Duplicate or out-of-order payment events do not duplicate fulfilment.
- [ ] Expired invoices and delayed payments reconcile without lost funds or accidental shipping.
- [ ] Private orders cannot be accessed by changing a reference or reusing another customer's credentials.
- [ ] Destination and buyer restrictions run before accepting payment.
- [ ] Every fulfilled order maps to the dispatched batch and document version.

### Presentation

- [ ] Critical pages work at 360, 390, 768 and 1440 CSS-pixel widths without horizontal overflow.
- [ ] Keyboard focus, labels, error messages, contrast and reduced motion are reviewed.
- [ ] No critical runtime errors or missing translation messages occur in core journeys.
- [ ] Performance targets: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1; distinguish lab tests from field measurements.
- [ ] Search, empty results, filters and unavailable variants have clear states.
- [ ] Production has correct metadata, canonical/hreflang handling and sitemap; staging and private pages are not indexed.

### Reliability

- [ ] Backups restore successfully; rollback preserves order and payment integrity.
- [ ] A small controlled live pilot confirms receipt, reconciliation, shipment and refund operations for approved products.

### Pilot success criteria (Phase 5)

| Metric | Target |
| ------ | ------ |
| Orders in pilot | 5–20 across approved SKUs only |
| Manual reconciliation exceptions | 0 unexpected |
| Refund cycle completed end-to-end | 1 or more successfully |
| Lost funds / misallocated shipments | 0 |
| Pilot duration | 2–4 weeks |
| Customer feedback mechanism | Documented and active |

Do not claim full security certification from these checks. Resolve concrete failures and required release gates; avoid repeated broad audits without a defined remaining risk.

---

## 12. Delivery sequence and estimates

Estimates assume one experienced developer with design, content and operational support. Product classification, original evidence and provider approval may extend calendar time.

### Phase plan

| Phase | Deliverable | Effort estimate | Dependency |
| ----- | ----------- | --------------- | ---------- |
| 1 | Repository/integration inventory, eligibility and evidence register | 2–4 working days | Access to repository and business records |
| 2 | Catalogue, units, purchase modes, batch data and document repairs | 4–7 days | Approved product facts and original reports |
| 3 | Checkout, payment events, portal, receipts, inventory and fulfilment | 7–12 days | Reliable catalogue and approved payment method |
| 4 | Navigation, visual polish, localisation, accessibility and editorial cleanup | 4–7 days | Stable page and data structures |
| 5 | Release verification, restore/rollback demonstration and controlled pilot | 3–5 days | All P0/P1 requirements completed |

**Planning range:** approximately **4–7 weeks** of implementation, excluding external approval/evidence delays. No infrastructure purchases or live deployment are authorized by this document alone.

### Calendar milestones (proposed)

| Milestone | Target week | Acceptance |
| --------- | ----------- | ---------- |
| D1–D3 decisions confirmed | Week 0 | Decisions recorded (§13) |
| P0 catalogue defects closed | End of week 2 | §11 correctness checks pass |
| Staging checkout round-trip | End of week 4 | Test order paid, dispatched in test mode, RTO/RPO documented |
| Localisation parity (FI/EN) | End of week 5 | Missing-key and fallback checks pass |
| Pilot live | Week 6 | First pilot order paid through refund completion |

### Indicative cost envelope (excluding labour)

All figures are first-pass estimates in EUR; verify each line against current provider pricing before committing.

| Item | Indicative band | Notes |
| ---- | --------------- | ----- |
| EU VPS (2× environments, 12 months) | €720–€1,800 | Hetzner CX/CCX reference; verify location |
| Domain + WHOIS privacy + TLS | €30–€80 / yr | Verify registrar jurisdiction |
| Coinbase Commerce fees | ~1% of crypto revenue | Track by method; reconcile weekly |
| Stripe fees | 1.5–3% of fiat revenue | Track by method; reconcile weekly |
| Email / transactional | €0–€240 / yr | Verify EU data residency |
| Analytics / error reporting | €0–€240 / yr | Verify EU data residency |
| Legal review (per workstream) | external | Quotes required |
| Insurance and accounting | external | Quotes required |

---

## 13. Decisions and inputs still required

Track each decision in a register with owner, target date and resolution. The first three (D1–D3) block all other work.

| ID | Decision / input | Owner | Target | Status |
| -- | ---------------- | ----- | ------ | ------ |
| D1 | Confirmed sales model (B2B / restricted B2C) | Product owner | Week 0 | Open |
| D2 | Confirmed payment mix (Stripe + Coinbase Commerce; BTCPay deferred) and any per-method display rules | Ops lead | Week 0 | Resolved — hybrid (Coinbase live; BTCPay deferred) |
| D3 | Confirmed destination countries and per-SKU buyer categories | Product owner | Week 0 | Open |
| D4 | Repository access and current deployment configuration | Eng lead | Week 1 | Open |
| D5 | Named technical and operational owners for each workstream | Eng lead | Week 1 | Open |
| D6 | Actual company details (legal name, address, VAT, Business ID) | Product owner | Week 1 | Open |
| D7 | Original product specifications, batch reports and supplier evidence | Quality lead | Week 2 | Open |
| D8 | Existing payment-provider agreements and wallet custody responsibilities | Ops lead | Week 2 | Open |
| D9 | Carrier contracts, packaging procedures and return process | Ops lead | Week 3 | Open |
| D10 | Actual database, email, analytics and authentication services | Eng lead | Week 1 | Open |
| D11 | Hosting budget and maintenance arrangement | Ops lead | Week 1 | Open |
| D12 | Average order value, expected volume and customer payment preferences | Product owner | Week 2 | Open |

Start with CAT-01, DATA-01, DOC-01, ORG-01 and UNIT-01. They directly affect price integrity, trust and the reliability of every later checkout feature.

---

## 14. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
| -- | ---- | ---------- | ------ | ---------- |
| R1 | SKU legal classification differs from current "research-only" framing | Medium | High | D1 first; regulatory sign-off per SKU before launch (§4) |
| R2 | Original supplier evidence cannot be produced | Medium | High | Halt listing; do not synthesise reports (§5 gate) |
| R3 | Crypto on-chain fees exceed margin on small orders | High | Medium | Stripe default; Coinbase Commerce opt-in only; document network-fee caveat at checkout (§7) |
| R4 | Compromised checkout substitutes a receiving address | Low | Critical | Watch-only wallet + server-side derivation verification (§7) |
| R5 | Support staff pressure to override prices or addresses | Medium | High | Refund signing flow; address-changing process is logged (§7) |
| R6 | Document URL indexed by third-party AI scrapers | Medium | Medium | `noindex` on residual URLs; removal requests (§10) |
| R7 | Pilot order refunds expose refund-flow gaps | Medium | High | Mandatory pilot success criteria before general launch (§11) |
| R8 | Translation drift across locales | Medium | Medium | CI lint for missing keys; language review per release (§10) |
| R9 | Marketing claims outpace evidence | Medium | High | Claim-to-evidence register; remove claims until substantiated (CLAIM-01) |
| R10 | Age-gate blocks B2B UX | Low | Low | Replace or remove once D1 is decided (§2) |
| R11 | Coinbase Commerce checkout abandonment due to hosted-page UX | Medium | Medium | Stripe remains default; mirror order status server-side; reconcile via `charge:confirmed` webhook (§7) |
| R12 | Backup restore not actually tested before launch | Medium | High | Demonstrate restore in Phase 5 with documented RPO/RTO (§11) |

---

## 15. Workstream dependencies

```
                          [D1–D3 confirmed]
                                  │
                                  ▼
                          §4 Eligibility & evidence
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
            §5 Catalogue     §9 Hosting      §10 Policies
                  │           (parallel)
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   §6 Visual   §7 Checkout §8 Fulfilment
                 (with §9)      │
                       │        │
                       └────┬───┘
                            ▼
                    §11 QA + Phase 5 runbook
                            │
                            ▼
                       Pilot → Launch
```

Read this as: §4 unblocks §5, §9 and §10. §5 unblocks §6, §7 and §8. §11 and Phase 5 follow once §5–§10 are stable. Pilot depends on every gate above passing.

---

## 16. "Do Not" checklist

Lift these lines into per-sprint review. Each one corresponds to a known failure mode.

- [ ] Do not create substitute laboratory certificates to fill missing files. (§5)
- [ ] Do not promise anonymous institutional verification. (§4)
- [ ] Do not promise a particular batch without reservation logic. (§6)
- [ ] Do not put seed phrases or spending keys on web servers, repositories, logs or chat. (§7)
- [ ] Do not rely on cold storage alone; verify receiving addresses server-side. (§7)
- [ ] Do not let support staff replace payment addresses through chat. (§7)
- [ ] Do not promise indefinite reservation of the current batch without inventory and expiry support. (§7)
- [ ] Do not treat crypto (Coinbase Commerce) as the only payment method. (§7)
- [ ] Do not begin a BTCPay migration while Coinbase Commerce is still receiving production orders; plan, scope and resource first. (§7 deferred)
- [ ] Do not publish temperature-log claims without a service that supplies them. (§8)
- [ ] Do not move the storefront without a documented benefit. (§9)
- [ ] Do not rely on EU hosting to prove EU processing for analytics, email, support or backups. (§9)
- [ ] Do not treat research-use disclaimers as classification evidence. (§4)
- [ ] Do not publish claims that lack a current evidence owner. (CLAIM-01)
- [ ] Do not accept payment before destination and buyer restrictions have been enforced. (§7)
- [ ] Do not claim full security certification from these checks. (§11)
- [ ] Do not skip the rollback runbook because "we'll fix it later". (§9)

---

## 17. Glossary

- **B2B / B2C:** Business-to-business / business-to-consumer sales.
- **BTCPay:** Self-hosted Bitcoin and Lightning payment processor. Deferred to a post-launch phase for this project; see §7.
- **COA / Certificate of Analysis:** Laboratory report attesting test results for a specific batch.
- **Coinbase Commerce:** Hosted crypto checkout provider. Live in this project; creates a hosted charge page and posts signed webhooks to `/api/webhooks/coinbase`.
- **D1 / D2 / D3:** The three blocking decisions (§0, §13).
- **EU-hosted:** Hosted in the European Union; verify processor-by-processor, not just by primary region.
- **Purchase mode:** Whether a variant is `direct purchase`, `quotation required`, or `unavailable`.
- **Quotation-only:** Sold via negotiated quote, never via standard checkout.
- **RACI:** Responsible, Accountable, Consulted, Informed.
- **RPO / RTO:** Recovery point objective / recovery time objective.
- **SKU:** Stock-keeping unit; a sellable variant.
- **Stripe:** Fiat payment processor. Live in this project; PaymentIntents created with an `idempotencyKey` per order.
- **VAT ID:** Value-added-tax identifier used for intra-EU B2B trade.

---

## 18. Reference pages

Site evidence reviewed on 11 October 2026:

- Homepage: https://averianlabs-demo.netlify.app/fi
- Catalogue: https://averianlabs-demo.netlify.app/fi/shop
- AOD-9604: https://averianlabs-demo.netlify.app/fi/shop/aod-9604
- BAC water: https://averianlabs-demo.netlify.app/fi/shop/bac-water
- COA registry: https://averianlabs-demo.netlify.app/fi/coa
- Documents: https://averianlabs-demo.netlify.app/fi/documents
- Quality methodology: https://averianlabs-demo.netlify.app/fi/lab-tests
- Shipping and returns: https://averianlabs-demo.netlify.app/fi/support/shipping-returns
- Terms: https://averianlabs-demo.netlify.app/fi/legal/terms
- Privacy: https://averianlabs-demo.netlify.app/fi/legal/privacy

Official references consulted in the preceding review; confirm applicable details during implementation:

- Fimea classification service: https://www.suomi.fi/services/classification-decision-finnish-medicines-agency-fimea/466fc0e0-d490-4c8d-8c32-74831644fdc3
- KKV online-store information obligations: https://www.kkv.fi/en/consumer-affairs/online-stores/obligation-to-provide-information-in-online-stores/
- Finnish Tax Administration, intra-community trade: https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/vat/international-commerce/intra-community-trade/
- Coinbase Commerce API (charges): https://docs.cloud.coinbase.com/commerce/reference/createresource
- Coinbase Commerce webhooks: https://docs.cloud.coinbase.com/commerce/docs/webhooks
- Signal username privacy: https://signal.org/blog/phone-number-privacy-usernames/
- Hetzner locations: https://docs.hetzner.com/cloud/general/locations/

Deferred references (do not act on until the BTCPay migration is scheduled):

- BTCPay wallet documentation: https://docs.btcpayserver.org/FAQ/Wallet/
- BTCPay Lightning setup: https://docs.btcpayserver.org/LightningNetwork-Setup/

---

End of plan. No infrastructure purchases or live deployment are authorized by this document alone.