# FI/EN content inventory — 2026-10-15

This records the current working-tree text and its source. It is an implementation inventory, not independent language, scientific, legal or merchant approval.

- Dictionary rows: **1319**, of which **138** differ from the committed baseline.
- Separately authored transactional email rows: **25**.
- Missing Finnish keys: **0**.
- [Full key-by-key EN/FI ledger, previous changed text and source/state families](CONTENT_INVENTORY_2026-10-15.json).
- Regenerate with `node scripts/build-content-inventory.mjs` after copy changes.

## Termbase

| Concept | English | Finnish |
| --- | --- | --- |
| Main library | Documents | Asiakirjat |
| Batch subset | Batch documents | Eräasiakirjat |
| COA | Certificate of Analysis (COA) | Analyysitodistus |
| Educational page | Understanding test results | Analyysitulosten tulkinta |
| Variant identifier | Product code (SKU) | Tuotekoodi (SKU) |
| Quantity shown by catalogue | Nominal quantity | Nimellismäärä |
| g/mol | Molar mass | Moolimassa |
| Small divided sample | Aliquot | Osanäyte |
| Unsaved/private/submitted/public | Distinct actual states | Tallentamaton / yksityinen / lähetetty tarkistettavaksi / julkaistu |

## Non-dictionary and generated surfaces

| Source | States / coverage | Factual basis |
| --- | --- | --- |
| lib/email/receipt.ts | Paid receipt; item/SKU/batch; totals/tax/shipping; original documents | Order snapshot and confirmed payment; no delivery claim inferred from queued mail. |
| app/global-error.tsx | Global runtime failure; locale-derived EN/FI title, help and Retry | Observed runtime failure; inline copy remains independent of dictionary parity. |
| app/[locale]/error.tsx; app/[locale]/not-found.tsx | Route failure/404; home/retry | Route outcome; no private document existence disclosed. |
| lib/products/catalogue.ts; product translations in database | Name/description/category/quantity/SKU/price/stock/purchase eligibility | Current product/variant source records; approved exact specifications still owner-supplied. |
| lib/documents/service.ts; documents database records | Public/date/locale/access; product-wide versus exact batch/SKU; original file/version | Declared association and original source; publication is not suitability approval. |
| lib/ai/answers/{calculation,catalogue,guidance}.ts | Controlled result/source narratives; missing-input and no-evidence answers | Deterministic calculator, returned records, versioned guidance; independent scientific approval pending. |
| components/calculator/Calculator.tsx; lib/calculations.ts | Each mode; blank/invalid/example/catalogue/user/transferred/saved inputs; units/formula/rounding; CSV/copy/print/history | User quantities and deterministic results; nominal quantity is not an analytical content measurement. |
| components/ai/{AssistantCanvas,MessageList,ChatInput}.tsx | Welcome/tool/source/result cards; consent; in-flight/cancel/interrupted/retry/rate limit; reading position | Implemented tool/workflow state; saving is separate from processing a submitted message. |
| components/community/{ThreadComposer,ReplyBox,PostCard,ReportDialog}.tsx | Private draft/unsaved/replace/remove; submit/pending/rejected/published; sources/reactions/reporting | Owner visibility and human publication decision; reactions do not establish scientific credentials. |
| components/media/*; components/product/{ProductGallery,VialGraphic}.tsx; lib/glossary/sanity.ts | Illustration/diagram/photo; selected locale/SKU; alt/caption/source/review; loading/fallback/reduced motion | Asset registry and approved originals; scientific figures require text equivalents. |
| lib/seo/*; app/api/og/*; components/seo/JsonLd.tsx | FI/EN titles/descriptions/canonical/social/fallback/structured data | Environment-specific origin, actual locale and current allowed source fields. |
| app/[locale]/legal/*; lib/legal.ts | Seller identity/policies/retention/privacy/consent; missing owner configuration | Approved owner policies and actual operations; pending seller inputs remain explicit. |
| components/checkout/*; app/[locale]/checkout/* | Empty cart; quantity/price/tax/delivery; payment pending/paid/failed/review; validation/recovery | Current eligible SKU and merchant-provider state; real-provider rehearsals remain gated. |
| app/[locale]/account/*; app/[locale]/login/*; lib/gdpr/* | Authentication/recovery/export/deletion; permissions; expiry; saving acknowledgement | Account workflow and approved retention policy; no unconfirmed email-delivery promise. |

## Trust and approval limits

Product-wide documents remain applicable to their product; batch documents retain their exact batch/SKU. Public publication, batch release and suitability for a particular experiment remain separate facts. Empty searches, an empty public collection, an unreachable service, restricted access and an unavailable file must never use the same factual explanation.

Preserve original chemical identifiers, units, source dates and report versions. Use Finnish sentence case and British English consistently. A successful persistence acknowledgement is not a promise that an email has arrived. A private draft is not a published discussion. Community reactions are not scientific qualifications.

DE/SV/NL key parity retained. Document-library additions are translated; neutral metadata and new shared workspace/brand/home additions currently use English fallback and require native review.

Independent native Finnish/English and scientific review of changed scientific material remains pending. Seller details, approved policies, exact specifications and original batch reports will be supplied later. They were not invented or requested again. Existing test counts are historical until the final implementation checks run.
