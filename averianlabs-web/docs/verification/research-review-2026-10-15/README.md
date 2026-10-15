# Research review evidence — 15 October 2026

Use the [editorial review](../../RESEARCH_EDITORIAL_REVIEW_2026-10-15.md) for interpretation and the [deployment record](../../NETLIFY_DEPLOYMENT_2026-10-15.md) for publication identity. Raw failed and intermediate attempts are retained. Runtime completion is separate from numerical correctness, factual support, source validity and language approval.

| Evidence | Source and scope |
| --- | --- |
| `live-ai-evaluation.json` | Full 60-case baseline on `6acfdd709ba5414797142d54`: 50 completed, 10 interrupted, 16 numerical cases correct. This is not a release pass. |
| `editorial-assessment.json` | Technical/editorial assessment of all 60 baseline cases and subsequent findings. Independent scientific and native Finnish approval remain pending. |
| `candidate-before-catalogue-grounding/` | `2455bad`, deployment `6ad0a8030b55d220df56e700`; 29 HTTP checks and 28 browser states. |
| `candidate-before-guidance/` | `1d80307`, deployment `6ad0ab7a2d0ad08d3ddecfe6`; 18 targeted live cases and two ordinary retrieval-path requests completed, but manual review still found inaccurate conceptual explanations. |
| `candidate-before-catalogue-name-fix/` | `02e2613`, deployment `6ad0af404881d0397dded10e`; 18 cases completed, 17 guidance/numerical contracts passed. A consent answer bypassed its guidance tool; Finnish availability verification falsely rejected a real blend title. The first UI replay had a consent-click race; the corrected replay passed four states. |
| `candidate-before-quantity-provenance/` | `80d0486`, deployment `6ad0b31e8370b1d5b04aaa23`; 18 cases completed, 16 guidance/numerical contracts passed. English conceptual questions exposed a safe fallback and an unrequested example calculation. Both ordinary retrieval-path checks passed. |
| `candidate/` | Final application source `ed11107`, deployment `6ad0b7d8e5ad99401ce901bc`. Read its individual result files and the deployment record for actual outcomes; do not inherit an earlier attempt's pass. |
| `published/` | Independent public-domain HTTP/browser checks after promotion. |
| `local-checks.json` | Local tests, type checking, translation coverage and limits. Integration uses an isolated database and mocked merchant providers. |
| `restore-rehearsal.json` | Successful private logical-snapshot restore into a new empty local database, value/migration/foreign-key verification and rejection of an existing target. |
| `maintenance-local.json` | Unauthorized and repeated authorized maintenance requests against the isolated local application. No hosted scheduler was configured. |
| `dependency-audit.json` | Zero high/critical advisories, one moderate transitive advisory with no listed patch; audit exit 1 retained. |

The live evaluator uses anonymous read-only tools, disables persistence and retrieval, and observes normal rate limits. The two separate ordinary-path requests omit `noRetrieve`; the approved source corpus is empty, so they do not certify document-retrieval recall or native model execution on the hosted architecture. Browser replay files render exact recorded live responses without extra provider requests; they are labelled separately from live API evaluation.

Private database snapshots, credentials and original private records are not committed here. Seller identity, approved product specifications and original reports will be supplied by the owner later. Provider rehearsals, human scientific/customer acceptance and the expanded source/action/privacy evaluation remain release requirements.
