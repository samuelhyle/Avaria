# Netlify deployment — 13 October 2026

Historical release; superseded by [the 14 October research workspace delivery](NETLIFY_DEPLOYMENT_2026-10-14.md).

The updated full application is published at [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app) and was opened in the local browser. [Finnish](https://averianlabs-demo.netlify.app/fi) and [English](https://averianlabs-demo.netlify.app/en) are available. This remains a review site; customer orders are not released for merchant operation.

## Exact release

| Item | Value |
| --- | --- |
| Published at | 2026-10-13T16:59:09.070Z |
| Netlify project | `averianlabs-demo` |
| Deployment | `6ace61beba6ffc3bf19a5cbf` |
| Hosted build | `6ace61beba6ffc3bf19a5cbd` |
| Deployed source commit | `19e360d4ca6d46f29faca37a8788b8ae4f24972f` |
| Uploaded source ZIP SHA-256 | `e4f7bec686953d4a2e3f8d82a250c401610705150de629c0123b45fafaf66d04` |
| Runtime build | Linux, Node 22.23.3, pnpm 10.0.0, Next.js 15.5.27, Netlify Next.js Runtime 5.16.2 |

Netlify built the committed source ZIP using its existing hosted secrets. No environment files were uploaded and no hosted secret was copied into source. GitHub write access was unavailable; this deployment does not push local commits to the connected remote `demo` branch. The published deployment is locked to prevent that older branch from automatically replacing it. Sync the release source, verify the connected branch/build settings and resulting build, then unlock publication. See the [operations runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md).

The previous updated deployment is `6ace5eb6b3324e70d2db5b46`; the pre-launch deployment was `6aae5d93fc3faf427399be56`. Keep rollback code compatible with the applied database schema. Reverting older releases can also restore the indexing or accessibility defects fixed here; do not reset data as part of application rollback.

## Changes required for this host

- Repository-root Netlify and GitHub workflow configuration now uses the application subdirectory. The hosted build verifies a private snapshot, checks/adopts the known legacy migration baseline when required, applies forward migrations and a non-overwriting draft seed, compiles the app and checks deployment traces and route budgets.
- Existing PostgreSQL 18 constraint representation and the original site's 384-dimensional embeddings are handled explicitly. Migration 0004 gives fresh databases the same embedding dimensions; incompatible stored vectors cause a failure instead of removal. A disposable PostgreSQL rehearsal preserved account, order, price and stock data across baseline adoption and all five migrations.
- Optional CUDA downloads and unused macOS/Windows/GPU binaries are excluded from this Linux deployment. Linux CPU bindings and shared libraries remain in the traces. Narrow pnpm package patterns and a 4 GiB build heap allow dependency tracing to finish. Upload succeeded; 235.2 MiB describes the complete trace union, not the uploaded function ZIP size.
- Secret scanning remains enabled. Only four public branch/provider/model identifiers are excluded, as documented in the runbook. Actual database/authentication/provider credentials remain scanned.
- Checkout progress now wraps on small screens and marks the current step for assistive technology. A mobile scan exposed the previous inaccessible scrolling; regression tests cover both languages at 320, 390 and 414 px.
- `NEXT_PUBLIC_REVIEW_SITE=true` sets response `noindex, nofollow`, matching page metadata and crawler restrictions. Netlify's static TOML header rule did not reach SSR on the main domain, even though preview URLs received platform noindex. The final published domain was checked independently.

## Executed release checks

| Check | Result and scope |
| --- | --- |
| Hosted build, forward migrations, seed and route budgets | Passed with actual hosted configuration |
| TypeScript and lint | Passed; 0 lint errors and 52 warnings |
| Legacy deployment guards | 12 passed; disposable database preservation/incompatible-vector rehearsal passed |
| Review indexing unit checks | 4 passed; full review mode retains the backend |
| Targeted deployed browser regressions | 3 passed, 0 skipped: FI/EN mobile cart at three widths and crawler restrictions |
| Published HTTP checks | 14 passed: health, robots.txt and FI/EN home, catalogue, lab tests, quality, account and cart |
| Public APIs | Invalid quotation, checkout quote and AI payloads return 400; unauthenticated maintenance returns 401 |
| Published mobile browser checks | 8 pages at 390 px; no horizontal overflow, browser runtime errors or serious/critical axe findings |
| Actual Finnish assistant response | Completed an authenticated provider stream without conversation persistence; retrieval disabled for this smoke request |

These checks created no customer account/order or merchant test catalogue, sent no customer email and made no payment. The AI check does not certify scientific accuracy, indexed retrieval or execution of the hosted native model. Automated accessibility does not certify complete WCAG conformance. The earlier local unit/integration/browser/provider-mock run remains separately documented in [the improvement plan](RESEARCH_CUSTOMER_IMPROVEMENT_PLAN.md); its counts are not re-labelled as live merchant tests.

Evidence: [deployment metadata](verification/netlify-deployment-2026-10-13/deployment.json), [public checks](verification/netlify-deployment-2026-10-13/online-smoke.json), [preview checks](verification/netlify-deployment-2026-10-13/draft/online-smoke.json), [AI check](verification/netlify-deployment-2026-10-13/ai-smoke.json), [Finnish homepage](verification/netlify-deployment-2026-10-13/fi-online.png) and [Finnish cart](verification/netlify-deployment-2026-10-13/fi-checkout-cart-online.png).

## Private database recovery evidence

The original pre-migration application snapshot has SHA-256 `7955f21810259e041995300b6825155d54d74e530fb8c3157fd0f72e4486f02c`. It contains 41 public tables and the original empty migration ledger. The final build's snapshot has SHA-256 `87e4bb76a6ad3b74e6e51fa90bed274cbd430c033caba06f9673537df04a3aa5` and includes 44 public tables and five migration entries.

Both were verified in private deployment-scoped Blobs storage and exported to `~/Library/Application Support/AverianLabs/deployment-backups/` as `DEPLOY_ID-pre-migration.json` with file permission 0600. Their key is `database-release-backups/pre-migration.json`. Keep the private copies and associated deployments; deleting a deployment can remove its deploy-scoped store. No backup data is included in repository or public site assets. These are logical application snapshots, not full cluster/PITR recovery or a completed restore rehearsal.

At final pre-build snapshot: 0 accounts, 0 orders, 15 draft reference products, 0 active products, 0 batches and 0 documents. The seed did not add saleable stock or approved scientific evidence.

## Remaining merchant release inputs

The custom `averianlabs.eu` domain is not connected. Registered seller information, policy approval, original product/batch evidence, human FI/EN scientific editorial approval and real payment/email/storage/carrier/scheduler setup and rehearsals remain required. The application is online for review; draft references cannot become directly purchasable without approved specifications and exact released, documented batches. Follow the [release runbook](RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md) before accepting orders.
