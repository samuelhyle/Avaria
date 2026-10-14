# Research workspace deployment — 14 October 2026

Published at [averianlabs-demo.netlify.app/fi](https://averianlabs-demo.netlify.app/fi), with [English](https://averianlabs-demo.netlify.app/en) available. This remains a review application with noindex and draft-stock purchasing restrictions.

| Item | Exact release |
| --- | --- |
| Published at | `2026-10-14T20:05:28.948Z` |
| Netlify deployment | `6acfdd709ba5414797142d54` |
| Hosted build | `6acfdd709ba5414797142d52` |
| Application source commit | `f5140f6864ddc44814456c4b901e058bb91e177e` |
| Uploaded source ZIP SHA-256 | `4f9260777cdfde9aef3eb688a080c9a247df83ce75439f54131220f2678f9bd9` |
| Previously published deployment | `6acfd5a410f58f4a9708d83b` |

See the [implementation record](RESEARCH_WORKSPACE_IMPLEMENTATION_2026-10-14.md) and [ordered plan](UI_VISUAL_REVIEW_2026-10-14.md) for the delivered design, calculator, community and assistant work. Documentation and verification files can be committed after this application source; they do not change the deployed runtime.

## Verification

- Local production build, TypeScript, translation key/literal-call checks and five route budgets passed. Lint has 0 errors and 52 warnings. The unit suite passed 216 tests, including the actual local embedding model. Isolated database integration passed 26 tests; deployment guards passed 12.
- Browser suite: 121 passed, 2 explicit live-provider skips. It covers calculator modes/units/exports, SKU handoffs, private history/drafts, ownership, human publication review, language preservation, interrupted/error streams and retry, repeated hydration and responsive/accessibility checks. A private-page read retries only a transport-level ECONNRESET; status/content/ownership assertions remain strict.
- Final immutable deployment candidate: 29 HTTP checks, 28 browser states and 4 live model/tool checks passed. The calculation checks require actual deterministic tool results. Source and comparison checks require their authoritative tools. No live customers, orders, posts, emails or payments were created.
- Final public-domain verification is saved in [published checks](verification/research-workspace-2026-10-14/published/checks.json) and [live assistant checks](verification/research-workspace-2026-10-14/published/ai-smoke.json). The final main-domain results are read independently of the immutable deployment URL.

Earlier candidate checks found missing calculation arguments, an intermittent metadata/hydration mismatch, an incomplete assistant stream and a UUID falsely matched as a telephone number. The current implementation returns explicit missing inputs, prevents unvalidated arithmetic after tool failure, emits metadata before page streaming, surfaces interrupted streams with retry and distinguishes study identifiers from contact details. Earlier failed/partial runs remain separate evidence, not passes.

These checks are functional and numerical evidence, not scientific/editorial certification, complete WCAG conformance, real merchant rehearsal or execution of the complete 60-case live-model evaluation. No original product reports, scientific credentials or community activity were invented.

## Database recovery and source protection

The additive research-workspace migration is applied. The final build snapshot has 47 public tables and 6 migration ledger entries. Its verified SHA-256 is `8ccdd4f84bf7aa2ab8f79662023ee693b37af117b4b14acd717a8e33d7a4d5e0`. The private deploy-scoped key is `database-release-backups/pre-migration.json`. An independently verified 0600 copy is held outside the repository under the owner's Library/Application Support/AverianLabs/deployment-backups directory. Snapshot contents are never public assets.

The initial migration build's pre-change snapshot preserves the 44-table, 5-migration state with SHA-256 `54aba3b3fd943b318efe9a95636c12c009f06aec9fa4c392ec708cea09fe8380`. Existing data was not reset. These are application logical snapshots, not full-cluster/PITR restore rehearsals. Older application code must preserve pending-post privacy before it is restored.

Publication remains locked because the source was uploaded as a committed ZIP while the connected remote `demo` branch remains older. No GitHub push was performed. Synchronize the reviewed source to the intended connected branch, verify its build and then unlock automatic publication. Keep the current deployment and private recovery copies.

## Remaining release inputs

Approved seller details, original specifications/batch reports, scientific FI/EN editorial approval, the full live-model evaluation, maintenance scheduling, merchant provider/fulfilment rehearsals and backup restore rehearsal remain required. Molar conversion and original-report summaries remain gated on their actual source data and evaluations. Follow the [operations runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md) before accepting orders.
