# Research workspace implementation — 14 October 2026

Implements the first delivery in the [saved UI and research-tools plan](UI_VISUAL_REVIEW_2026-10-14.md). This is the database-backed Next.js application, not the earlier HTML concept. Merchant release remains subject to the [release runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md).

## Delivered behavior

- A smaller, consistent visual system; one brand identity; readable mobile navigation; compact product rows, inline catalogue search and meaningful filters; product identity and actions before media on mobile; optional 3D; structured document availability; shorter account, form and footer layouts. Platform branding and mobile safe areas have reserved space.
- A research-tools hub and shared deterministic calculator for concentration, required final volume, dilution and aliquots. Explicit mg/µg and mL/µL units, Finnish decimal entry, scientific notation, range checks, remaining material, formulas, assumptions and deliberate rounding. Unit and language changes preserve quantities. Reset, copy, CSV and print include the calculation context. Applicable SKUs populate nominal mass; volume supplies do not.
- Explicit private calculation history and community draft storage. Owner-only APIs, account export and immediate account-deletion cleanup. Asking the assistant does not publish a calculation; saving a draft does not send it to a model. Sign-in returns to the selected task with its inputs.
- Community search, category/language/unanswered filters and pagination; exact category/reply totals; readable thread rows; Markdown templates/preview and linked original sources. Participation levels do not claim professional credentials. Empty states explain participation without fabricating discussions.
- New community submissions are private pending human publication review. Durable moderation jobs, bounded retries, provider-unavailable recovery, deduplication and audited human decisions. AI recommendations do not publish posts. Public pages, activity, reactions and assistant discussion reading respect visibility. Review outcomes and published replies reach the localized account inbox.
- Averia has exact-SKU comparisons, authoritative document lookup, deterministic calculation result cards and explicit community draft preparation. Original documents expose version/date/batch context. Community reading is attributed and outside approved product evidence. Consent stays in the conversation flow. Memory and support acknowledgements follow successful persistence. Generated prose is buffered through targeted SKU/price/purity/stock/numerical checks; these checks are not a proof of every scientific claim.
- Catalogue retrieval includes source revisions, rejects changed/revoked records and avoids stale commercial facts in indexed prose. Bounded maintenance can refresh changed catalogue records without model availability. The existing reviewed-source retrieval restriction remains.
- Finnish/English customer copy was revised in the changed journeys. The five locale files retain key parity; new secondary-language copy uses the existing English fallback policy. Original document titles and author content remain attributed to their source.

## Data and operations

Migration `0005_research_workspace.sql` adds saved calculations, private forum drafts, durable moderation jobs, thread language and original-post identification, and corrects reply totals. It does not turn draft products into saleable stock. Public document presence is separate from batch release: locale, public access, publication date and product/batch association are checked independently.

The migration and mutation tests use an owned disposable PostgreSQL/pgvector database. Browser fixtures are clearly labelled QA records in that database, never supplier evidence. Hosted builds retain the existing private pre-migration snapshot, forward-migration and non-overwriting draft-seed process. Application rollback must remain compatible with this additive schema.

The moderation worker runs after submission and can resume through authenticated maintenance. Connecting and rehearsing the real maintenance scheduler is still an operations task. Human moderation can publish or reject without an AI provider.

## Verification ledger

Current executed check results and rendered application evidence are recorded under [the verification directory](verification/research-workspace-2026-10-14/). Local evidence: [check record](verification/research-workspace-2026-10-14/local-checks.json), [42 rendered states](verification/research-workspace-2026-10-14/local-visual-review.json), [Finnish calculator](verification/research-workspace-2026-10-14/local-desktop-fi-dilution.png), [Finnish mobile calculator](verification/research-workspace-2026-10-14/local-mobile-fi-calculator.png) and [calculation print](verification/research-workspace-2026-10-14/local-fi-calculation.pdf). Hosted deployment results are recorded separately after checking the candidate.

| Check | Executed result |
| --- | --- |
| Unit suite, including the actual local ONNX embedding model | 213 passed, 0 skipped |
| Isolated database integration suite | 26 passed, 0 skipped |
| Full browser suite | 118 passed; 2 live-provider tests explicitly skipped |
| Rendered application | 42 FI/EN light/dark states; HTTP 200, no overflow or runtime errors in the final serial capture |
| TypeScript / lint / translation keys and literal calls | Passed; 0 lint errors, 52 warnings; 1,215 keys, 5 locales, 0 missing |
| Production build / five route budgets / deployment guards | Passed; 12 deployment guards |
| Scientific editor and laboratory-buyer review | Pending; automated tests do not replace it |
| Paired live-model answer evaluation | 60 scenarios implemented; full execution pending isolated provider configuration |

The integration checks cover account isolation/export/deletion, private drafts, held submissions, publication/reply counts, moderation failure/retry, permission enforcement, and batch-only public reports versus wrong-product/private/future/other-language reports. Existing checkout tests retain signed-provider replay, idempotency and stock protection using test configuration.

The live evaluation script refuses a non-isolated target and disables write tools. A missing provider or a rate limit exits as incomplete instead of reporting success. Its answer archive requires separate factual-support, citation and Finnish/English editorial assessment.

## Remaining gates

1. Supply approved seller details, product specifications, exact batch records and original reports; rehearse merchant payment/email/storage/shipping and backup restore before taking orders.
2. Complete the full live-provider evaluation and human scientific/language review. Targeted numerical and claim checks reduce known errors; they cannot certify the entire generated answer.
3. Supply real reviewed introductory discussions and configure the maintenance scheduler. No fake users, researchers, popularity statistics or community activity were added.
4. Add molar conversion only with the correct approved chemical form, molar mass and composition. Add original-report summaries only when approved source text, access/version handling and evaluations exist. Broader community summaries and answer acceptance need their own product and evaluation review.
5. Measure actual customer friction and consent-respecting field performance before claiming improved conversion or responsiveness.
