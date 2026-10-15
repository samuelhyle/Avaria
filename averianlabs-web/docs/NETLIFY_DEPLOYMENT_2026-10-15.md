# Research review deployment — 15 October 2026

Published on [the Finnish site](https://averianlabs-demo.netlify.app/fi) and [English site](https://averianlabs-demo.netlify.app/en). The site was opened locally after publication. This remains the full Next.js review application with noindex/nofollow and draft-stock purchase restrictions. Merchant ordering has not been activated.

| Item | Exact release |
| --- | --- |
| Published at | `2026-10-15T11:32:28.393Z` |
| Netlify deployment | `6ad0b7d8e5ad99401ce901bc` |
| Hosted build | `6ad0b7d8e5ad99401ce901ba` |
| Application source commit | `ed11107f461c7d693ba8cc7443f8f7f5fca99b41` |
| Uploaded source ZIP SHA-256 | `630fedd6891eaacd8da708b95c3b3105ae893544c5c2f686b2622b0d2999d23d` |
| Previously published deployment | `6acfdd709ba5414797142d54` |
| Publication lock | Enabled pending source-branch synchronization |

Documentation and evidence can be committed after this application source; they do not alter the deployed runtime. Environment files were excluded from the source upload. The [ordered plan](UI_VISUAL_REVIEW_2026-10-14.md), [editorial review](RESEARCH_EDITORIAL_REVIEW_2026-10-15.md) and [evidence index](verification/research-review-2026-10-15/README.md) explain scope and remaining work.

## Changes

- Corrected Finnish/English scientific terminology and workflow copy, including molar mass, HPLC area purity versus quantitative content, final solution volume, publication review, privacy export, newsletter confirmation and password recovery.
- Calculation explanations are rendered from shared deterministic results and reviewed wording. Required quantities must come from user turns or an explicit normalized calculator handoff; conceptual questions cannot silently acquire invented example inputs. Missing inputs receive localized prompts.
- Catalogue and document replies use current returned records, exact SKU rows and explicit missing-evidence states. Verification accepts real controlled product titles while still rejecting fabricated SKU rows.
- Ten versioned bilingual guidance topics provide controlled explanations of scientific limits, evidence, credentials, moderation, consent and assistant capabilities. Unsupported numbered citations and failed factual lookups withhold unverified prose.
- Explicit no-persistence mode also prevents conversation creation, history loading and title updates. Buffered streams send keep-alives and clean up after completion, cancellation and abort.

## Executed verification

- 274 unit tests passed with the actual local embedding model enabled; TypeScript passed. Isolated database integration passed 26 tests with mocked merchant providers. The targeted local browser run passed 22 tests; deployment guards passed 12.
- Translation checks: 1,216 keys, five locales, zero missing keys; all literal calls resolve. Lint: zero errors and 52 warnings. Hosted compilation, 278 generated pages and all five route budgets passed.
- The full 60-case bilingual baseline was executed and assessed: 50 completed answers, 10 interrupted streams and all 16 numerical cases correct. It exposed substantive scientific/editorial defects and is retained as a finding-bearing baseline, not a pass.
- Final immutable deployment: all 18 targeted live cases completed and passed their required contracts: four numerical cases and 14 reviewed-guidance cases. The HPLC/content questions produced no successful unsolicited calculation. Two additional ordinary retrieval-path requests completed with their required authoritative tools. These checks do not replace a new full 60-case run or the expanded source/action/privacy release evaluation.
- Both immutable and public URLs passed 29 HTTP checks and 28 FI/EN page states each, with no horizontal overflow, runtime errors or critical/serious axe findings. Four additional FI/EN answer renders at 320/1440 px passed on each URL by replaying exact live candidate responses. Replays make no additional model requests.

See [final live answers](verification/research-review-2026-10-15/candidate/focused-ai-evaluation.json), [ordinary retrieval-path checks](verification/research-review-2026-10-15/candidate/default-retrieval-path.json), [public checks](verification/research-review-2026-10-15/published/checks.json) and [public answer replays](verification/research-review-2026-10-15/published/guidance-ui-replay.json). Review calls were anonymous/read-only with no saved conversations; no customer accounts, orders, posts, payments or emails were created.

Earlier incomplete or failed attempts remain labelled separately. The complete unit suite initially caught two quantity-guard regressions; normalized handoff parsing and trusted direct-call compatibility were corrected before the final 274-test pass. A Docker interruption was followed by a fresh 26/26 integration pass, with no skips. Automated runtime, tool and wording contracts do not certify independent scientific approval, complete accessibility, real merchant operation, retrieval recall or hosted native-embedding execution against an approved corpus.

## Recovery and source protection

The final deployment's private snapshot has 47 public tables and six migration entries. Its independently verified SHA-256 is `8aede7e699d0a4211439c017bde0c83005e633f9501ae13326378889a97e0119`. A checksum-verified copy is held outside the repository under Library/Application Support/AverianLabs/deployment-backups with file mode 0600. No snapshot contents or credentials are public assets.

A snapshot from deployment `6acfdd709ba5414797142d54` was actually restored into an empty local PostgreSQL/pgvector database: all 47 tables, 125 rows, six migration hashes and 48 foreign keys matched; a populated target was refused. This verifies the application logical-snapshot path for that recorded snapshot, rather than provider PITR, failover or retention. See [the aggregate restore proof](verification/research-review-2026-10-15/restore-rehearsal.json).

The published deployment remains locked because the linked remote `demo` branch is older than the uploaded committed source. No GitHub push was performed. Synchronize the reviewed source and verify its build before unlocking automatic publication. Older code must preserve pending-community privacy before rollback. There were no schema changes in this follow-up.

## Remaining release requirements

The owner will supply registered seller details, exact approved specifications and original batch reports later. Unsupported claims remain pending. Independent scientific/native Finnish/customer acceptance, the expanded source/action/privacy evaluation, real merchant/payment/email/storage/shipping rehearsals, authenticated hosted maintenance scheduling, provider recovery/retention approval and source-branch synchronization remain open. Molar conversion and original-report summaries stay gated on their actual source data and evaluation.

The dependency audit retains one moderate transitive `sprintf-js` finding with no listed patch; zero high/critical findings does not establish an all-clear. Follow the [operations runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md) before enabling orders.
