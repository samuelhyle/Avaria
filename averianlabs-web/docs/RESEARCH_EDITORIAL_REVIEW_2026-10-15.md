# Research interface and release review — 15 October 2026

Continuation of the [saved improvement plan](UI_VISUAL_REVIEW_2026-10-14.md). The owner confirmed that approved seller details, product specifications and original reports will be supplied later. Those inputs remain pending; their absence is not filled with reference examples.

## Completed technical and editorial work

The Finnish and English interface dictionaries were reviewed for terminology, unsupported claims, consistency and agreement with implementation. Existing keys were corrected for calculator metadata, molar mass, batch documents, catalogue categories, moderation/submission states, privacy exports, password recovery, newsletter confirmation and natural Finnish. Five-locale key parity is checked separately; it does not establish translation quality in German, Swedish or Dutch.

- The quantity reported in g/mol is labelled **Molar mass / Moolimassa**. Internal database field names remain compatible.
- The laboratory calculator is named for its actual four calculation modes. Final solution volume stays distinct from added solvent volume. Results distinguish nominal inputs, calculated quantities and measurement precision.
- HPLC **area purity** is described separately from quantitative peptide content. The copy does not imply that all HPLC methods are incapable of quantitative measurement. Original methods, standards and results still need assessment.
- Navigation and document descriptions say what is available. Unused legacy wording about a universal 98% pass threshold was replaced with batch-specific interpretation language.
- Research category labels are consistent between the home page and catalogue. No customer logos, clinical credentials or research endorsement were introduced.
- Community wording explains submission for human publication review. Participation points reflect reactions and do not establish qualifications. Finnish rules use plain language and explain the existing support route for review questions.
- Password recovery acknowledges a request, without promising completed delivery. Account export is described as a download, matching the actual endpoint. Newsletter requests still require confirmation.

This is a code-assisted technical/editorial review. Independent scientific editorial approval, native Finnish customer review and laboratory-buyer acceptance are still pending. It is not legal approval of the seller's future policies or approval of any actual material.

## Live assistant evaluation and resulting corrections

The paired evaluation contains 30 scenarios in English and Finnish: 60 requests covering calculations, units, invalid inputs, missing evidence, exact SKUs, confidentiality, consent, readiness and moderation. It now saves every answer and full returned tool results incrementally, requires the terminal stream event, preserves incomplete runs, and supports an explicit anonymous hosted-review target. It refuses other hosted origins, redirects and hosted authentication cookies; checks that review noindex/nofollow headers remain; and always sends `noPersist`, `readOnly` and `noRetrieve`.

The local mode additionally requires a matching local test database. The evaluation respects the normal rate limit and resumes from saved cases; it does not change limits or spoof identities. The hosted run assesses public tools and the model, without creating customer accounts, posts, orders or saved conversations. Retrieval and authenticated customer journeys remain separate checks.

The initial answer review found that correct tool mathematics could coexist with an invented numbered citation, unsupported residual-volume handling advice, misleading Finnish wording about nominal content and an incorrect explanation of upward dilution. These answers remain in the evaluation archive as evidence.

Corrections:

1. Successful calculation explanations are now rendered from recomputed shared results and controlled bilingual interface wording. They include the actual inputs, formula, units, assumptions and rounding. Arbitrary model-written procedures and scientific claims are not carried into that explanation.
2. A numbered citation must correspond to a source actually returned for that response. An unsupported reference withholds the generated factual answer.
3. Upward-dilution instructions distinguish the mass-balance equation from the requirement to add solvent. They do not propose unapproved concentration procedures.
4. Explicit `noPersist` now prevents conversation creation, history loading and automatic title updates as well as message persistence, including for a signed-in owner who previously consented.
5. Buffered streams send periodic SSE keep-alive comments and clean up on completion, cancellation or request abort. This addresses idle intermediaries without releasing unchecked prose. The initial deployment also returned incomplete streams for several conceptual questions; hosted retesting is recorded separately, and the precise infrastructure cause is not assumed.
6. Standard scientific and platform explanations use a read-only guidance tool with ten versioned English/Finnish topics. The server renders the reviewed topic directly, rather than accepting the model's additional procedures, unsupported claims or links. These topics cover nominal content, HPLC area purity, dilution limits, final volume, batch scope, unavailable molar conversion, participation, human publication review, consent and the static assistant label. Separate support/community action narratives retain their workflow. A failed guidance lookup cannot fall back to an unverified generated explanation.
7. Route-level tests exercise hostile generated calculation prose, eight-digit rounding in both locales, unsupported citations and no-persistence behavior. A completed numerical calculation is still not an analytical measurement or scientific certification.

The baseline answers also identify free-form weaknesses: some internal field/category names remain visible; unknown SKUs can trigger an unhelpful generic fallback; some answers suggest future stock monitoring or automatic report publication; and one batch-association explanation adds an unsourced regulatory claim. These findings are recorded separately and prevent treating numerical completion as editorial acceptance. Catalogue, comparison and document prose now use controlled responses from returned records, including explicit no-match states, real units, supported prices and missing evidence. Separate community/action narratives retain their existing workflow. Platform facts now explicitly ground participation levels, human moderation, consent, the static assistant label, unimplemented monitoring/molar conversion, and report sampling scope. Independent scientific/editorial acceptance still remains open.

The full baseline executed all 60 cases: 50 completed and 10 interrupted streams; all 16 numerical cases agreed with the shared calculator and no invalid-input case returned a successful calculation. This baseline is a finding-bearing evaluation, not a release pass. The live answer archive and its final assessment are in [the evidence directory](verification/research-review-2026-10-15/). The intermediate 18-case rerun and two normal-path checks completed, including previously interrupted requests. Manual review still found inaccurate Finnish general-science explanations, so those results are retained before the guidance correction. Final deployment identity and targeted results are recorded separately; no partial or runtime-only run is counted as a scientific pass.

## Recovery rehearsal

The private snapshot for deployment `6acfdd709ba5414797142d54` was checksum-verified and restored into a new, empty local PostgreSQL/pgvector database. All 47 public tables and 125 stored rows matched; the six migration hashes matched; all 48 foreign keys were re-added and validated. A second attempt correctly refused the already populated database. The scratch database was removed after the rehearsal. Only aggregate evidence is stored in [restore-rehearsal.json](verification/research-review-2026-10-15/restore-rehearsal.json); original snapshot data stays private outside the repository.

The reusable [restore script](../scripts/rehearse-restore.ts) refuses a remote database, an ordinary application database name, a non-empty database, a checksum mismatch and a migration/table/column mismatch. Create an empty local database named `averian_restore_rehearsal_*`, then set `RESTORE_TEST_DATABASE_URL`, `RESTORE_SNAPSHOT_PATH` and `RESTORE_SNAPSHOT_SHA256` privately before running `pnpm exec tsx scripts/rehearse-restore.ts`.

This establishes the application logical-snapshot restore path for the recorded snapshot. It does not establish Neon PITR, provider failover, recovery time objectives or future backup retention. Those operational approvals remain open.

The maintenance endpoint was also rehearsed against the isolated local app: missing and incorrect credentials returned 401; two successive authorized runs returned 200. This verifies the endpoint locally with real external providers disabled; it does not configure or certify the hosted schedule. See [maintenance-local.json](verification/research-review-2026-10-15/maintenance-local.json).

The production dependency audit reported no high or critical advisories and one moderate transitive `sprintf-js` advisory, with no patched version listed in the advisory response. The command exited 1; this is retained as a finding rather than an all-clear. See [dependency-audit.json](verification/research-review-2026-10-15/dependency-audit.json).

## Owner-supplied inputs and remaining order

1. Supply the registered seller details and approved commercial/privacy/retention policies through the deployment's configuration and source records.
2. Supply exact SKU specifications and batch records with the original reports, permitted publication/access, method, unit, date, laboratory and evidence reference. Approve each record before release assignment. No approved batches or documents were invented.
3. Complete independent scientific/editorial and laboratory-buyer acceptance using the recorded interface and answer evidence. Resolve or explicitly accept remaining generated-answer findings.
4. Configure and rehearse the real payment, email, storage and shipping providers in their intended sandboxes. Verify webhook/retry/refund, signed access, sender identity and fulfilment with the actual accounts.
5. Synchronize the reviewed source with the connected deployment branch, configure the authenticated maintenance schedule, and rehearse provider recovery/retention. The uploaded review deployment stays protected until source synchronization is verified.
6. Enable ordering and the approved canonical domain only after the release checks and owner inputs are satisfied. Molar conversion needs the approved chemical form, molar mass and composition. Report summaries need approved original text, access/version rules and separate evaluations.

## Scientific terminology sources

The distinction between mass concentration and amount-of-substance concentration follows the [IUPAC concentration entry](https://goldbook.iupac.org/terms/view/C01222) and [NIST SI quantity guidance](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-8). The latter describes molar mass in g/mol and concentration relative to mixture volume. We use these definitions to name the quantities; they do not validate a particular experiment.

The distinction between chromatographic area purity and quantitative peptide content is informed by [NIST's peptide quantification comparison](https://www.nist.gov/publications/survey-peptide-quantification-methods-and-their-reproducibility-comparison-case-study) and [peptide purity mass-fraction assignment study](https://www.nist.gov/publications/state-art-and-trends-si-traceable-value-assignment-purity-peptides-using-model-compound). These studies discuss calibrated assays and complementary measurement approaches; neither is a report or endorsement for an AverianLabs product.
