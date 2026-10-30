# Research storefront release and operations runbook

Updated: 15 October 2026. This accompanies [the implementation plan](RESEARCH_CUSTOMER_IMPROVEMENT_PLAN.md).

## Current hosting and deployment

The connected full Next.js application is hosted at [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app), Netlify project `averianlabs-demo`, site ID `a10936e5-0fc8-4d2b-8ccd-58207323cd6f`. The merchant release is approved and the review-site gate has been removed: the storefront is indexable and the canonical origin resolves from the deployment. The planned `averianlabs.eu` domain and older Vercel deployment descriptions are not evidence of a connected live custom domain — that domain is not registered (EURid reports it available, and it has no name servers), so the live origin is used until a domain is connected and `NEXT_PUBLIC_SITE_URL` points at it.

The Git repository root contains `netlify.toml` and `.github/workflows`; the application is in `averianlabs-web`. Build base is `averianlabs-web`. The nested Netlify configuration is synchronized with the root configuration because Netlify can resolve either depending on project settings. The linked remote branch is `demo`; the 13 October release uses a committed source ZIP uploaded to Netlify's hosted build API. A local CLI build cannot retrieve write-only hosted secrets. Publishing a ZIP does not push commits to GitHub or change that linked branch.

Each hosted build first stores and reads back a SHA-256-verified private snapshot of public application tables, schema metadata and the Drizzle migration ledger. Its deploy-scoped Blobs key is `database-release-backups/pre-migration.json`. This is an application logical snapshot, not a full database-cluster backup or a replacement for provider recovery. Export it to private storage before deleting its associated deployment. It is never a public asset or repository artifact.

An existing database without migration history is adopted only if its complete public schema matches the original reviewed snapshot. PostgreSQL 18 not-null constraints are checked through column nullability. The existing deployment's 384-dimension embedding column is the only accepted variation from the original 1024-dimension snapshot. Adoption inserts migration 0000's hash and timestamp transactionally under an advisory lock; it does not recreate tables. Unknown schema differences stop the build. Forward migrations and the non-overwriting draft seed run before compilation. Migration 0004 aligns fresh embedding columns with the runtime's 384 dimensions and refuses incompatible non-null vectors rather than discarding them.

Netlify's production build-scoped `SECRETS_SCAN_OMIT_KEYS` contains only `NEON_BRANCH,MINIMAX_BASE_URL,MINIMAX_CHAT_MODEL,MINIMAX_EMBEDDING_MODEL`. The scan flagged these public branch/provider/model identifiers already present in source code as secrets. Database URLs, authentication secrets and provider keys remain scanned; scanning itself remains enabled. Reassess these four exceptions when changing configuration. See [Netlify's documented key-specific exclusions](https://docs.netlify.com/build/environment-variables/secrets-controller/#configure-secret-scanning).

Netlify's server function uses Linux CPU inference. `ONNXRUNTIME_NODE_INSTALL=skip` prevents optional CUDA downloads during dependency installation. For this build target only, Next.js traces exclude ONNX binaries for macOS, Windows and unused CUDA/TensorRT providers. Explicit trace includes and `scripts/check-server-traces.mjs` verify that Linux x64 and ARM CPU bindings and shared libraries remain present. Other targets retain their platform traces. Check upload success and the actual hosted runtime when upgrading these packages; a successful local native model test alone cannot establish serverless compatibility.

Build-only `NODE_OPTIONS=--max-old-space-size=4096` permits Next.js dependency tracing beyond Node's default 2 GiB heap. Native-file globs target the pinned package's pnpm store directory rather than recursively traversing all `node_modules` directories. Neither setting increases a function's runtime memory allocation.

Keep the previous published deployment locked while building and checking the new deployment at its unique HTTPS URL. Check both Finnish and English pages, health, invalid request validation and browser accessibility without creating customer records. Unlock and publish the new ready deployment only after those checks pass, then repeat them on the public project URL. Application rollback must remain compatible with applied migrations; never reset the database to make a deployment succeed.

The [14 October deployment record](NETLIFY_DEPLOYMENT_2026-10-14.md) identifies the current published release. The [13 October record](NETLIFY_DEPLOYMENT_2026-10-13.md) remains historical. It remains locked because the linked remote `demo` branch is older than the uploaded local source. Sync the release commits to the intended remote branch, check the connected branch and build settings, and verify the resulting hosted build before unlocking automatic publication. The current release still uses uploaded local source; no remote commits were pushed.

The review gate is gone. `NEXT_PUBLIC_REVIEW_SITE` is no longer set in the build environment, the `X-Robots-Tag: noindex, nofollow` response header and the static TOML header block have been removed, `robots.txt` allows crawling, and the page metadata declares the pages indexable. The canonical origin, the sitemap and the `robots.txt` sitemap reference all resolve through `lib/seo/site-origin.ts`, so they name the origin that actually serves the site rather than a hardcoded domain.

Netlify's static TOML headers alone do not apply to server-rendered responses on the public project domain, so the Next.js response header is the one that decides. Preview URLs can still receive platform `noindex` independently — check the main published URL as well as the preview. See [Netlify's custom-header limitations](https://docs.netlify.com/manage/routing/headers/#limitations).

To re-hide the site while a release is pending, set `NEXT_PUBLIC_REVIEW_SITE=true` in the Netlify build environment again: the application code path for it is unchanged, only the build configuration was removed.

## Supported behavior

Direct checkout supports Finland, EUR, card payments and prices including 25.5% Finnish VAT. Shipping is free when product subtotal reaches €150; otherwise the selected rate is included in the total. A VAT ID records invoice information and does not activate reverse charge. Additional destinations require a quotation and an approved tax policy.

Products require database status `active`, specifications with `verified: true` and an owner-approved `evidenceRef`, a positive direct-sale price and an explicitly assigned, reviewed, unexpired batch for the exact SKU. The batch must have a published public COA available in the Finnish and English registry with a usable HTTPS file URL. Assignment uses `vials.activeBatchId`; a product-level default is accepted only for its exact vial. The system does not infer the newest batch. Reference and draft data cannot establish direct-sale availability.

Seed is non-overwriting and creates draft, zero-stock reference records. Never use browser fixtures in a merchant database. The scientific values in an isolated test fixture are not evidence for a real product.

## Owner inputs before release

1. Configure the registered company name, Business ID, VAT ID, address and verified contact email using the `NEXT_PUBLIC_LEGAL_*` variables. Obtain approval of the actual buyer eligibility, Finland launch policy, VAT, delivery rates, returns and retention rules. The supplied policy pages describe implementation and identify missing seller information; code does not establish legal approval.
2. Approve each product's identity from original records: product type, exact compound/sequence, CAS where applicable, molecular formula and mass, salt form, blend proportions, size/unit and storage. Record the source/version in `specJson.evidenceRef`; leave unsupported fields absent. Review chemical identity separately from chromatographic purity, material content and biological activity.
3. Add actual batch and document records, original reports, method, units and validity. Review the batch before setting `verificationStatus: released`, `reviewedBy`, `reviewedAt` and the exact vial assignment. A report's presence is not an automatic PASS or accreditation claim. Public document URLs must be publicly readable; private documents use configured storage and authenticated, short-lived signed URLs.
4. Review the final Finnish and English pages and customer emails with a human scientific editor. Use *analyysitodistus (COA)*, *erätunnus*, *näytepullo*, *liuotus*, *pitoisuus* and *alikvootti* consistently. Technical units include mg, µg, mL, µL and EU/mg. Confirm original report languages and localized descriptions explicitly. Swedish and Russian coverage is complete and every locale's storefront copy has been reviewed for translation quality, but the Finnish and English scientific copy still needs a human scientific editor. The four shipped locales are `en`, `fi`, `sv` and `ru`.
5. Configure PostgreSQL, Stripe publishable/secret keys and webhook secret, Resend key and a verified sender, storage where needed and `CRON_SECRET`. Validate the actual carrier/rates before enabling checkout. Cryptocurrency creation, cart marketing, public product reviews, subscriptions and loyalty discounts remain disabled until their customer/provider/consent workflows are implemented.

## Repeatable verification

Use Node 22 and the package manager version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm check:i18n
pnpm check:i18n:usage
pnpm test
pnpm test:deployment
pnpm audit --prod --audit-level=high
pnpm build
pnpm check:bundle
```

Integration tests require explicit, matching `DATABASE_URL` and `TEST_DATABASE_URL`. Tests refuse implicit or remote merchant databases; permitted isolated database names are `averian_reliability` locally and `build` in CI. Use a disposable `pgvector/pgvector:pg16` instance, not a database containing customer data.

```sh
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm test:integration
pnpm exec tsx scripts/seed-test-commerce.ts
pnpm test:e2e
pnpm test:a11y
pnpm exec tsx scripts/seed-test-commerce.ts --cleanup
```

For a separate local verification server, set `NEXT_DIST_DIR` consistently for build, start and bundle checks, and set `BASE_URL`/`E2E_PORT` for Playwright. Disable real sending/provider keys for browser runs. Provider integration tests sign Stripe events locally and mock intent creation/email delivery; they do not contact a merchant API.

Before an actual release, run `pnpm release:check` using the real target configuration. This intentionally fails without company details, required providers, HTTPS and a released, documented SKU, or if test fixtures remain. A pass is a technical prerequisite, not evidence that source records, policies or live providers have been independently approved.

## Merchant sandbox verification

Run these with real sandbox accounts after configuration, before enabling customer orders:

- Successful card payment, decline, 3DS completion/cancel, reload/lost response and duplicate submission. Confirm one order, one PaymentIntent and one reservation.
- Signed webhook amount/currency/reference mismatch, duplicate event and webhook retry. Confirm the event ledger records only completed effects and one queued receipt.
- Expiry without payment restores stock once. Late payment either reacquires the same approved batch or enters `payment_review`; it must not silently substitute a batch or claim successful fulfilment.
- Real email delivery/retry, Finnish/English receipts, protected guest confirmation link and original documents for purchased batch snapshots. Check the verified sender and reply address.
- Authenticated private storage URL expires after five minutes; unauthenticated users cannot access private metadata or files. Test actual public-report connectivity and CSP/CORS for inline preview.
- Confirm actual carrier labels/tracking, dispatch process and refunds in operations. These were not certified by mocked provider tests.

## Maintenance and recovery

The authenticated `/api/cron/maintenance` endpoint releases expired reservations, retries queued email and purges disabled account shells after 30 days. Configure repository variable `MAINTENANCE_BASE_URL` with the verified production HTTPS URL and repository secret `CRON_SECRET` matching the server. The maintenance workflow runs approximately every five minutes when configured. GitHub schedules can be delayed; use a reliable external scheduler if strict timing is required. Checkout and order reads also release expired reservations, so stock recovery does not depend solely on the schedule.

Account deletion immediately disables credentials and removes/anonymizes private profile content. The 30 days describe cleanup of the disabled database shell, not a restoration period. Required order records are retained separately. Confirmed deletion is an explicit POST; opening the account-deletion link does not delete the account.

Inspect `email_outbox` for pending messages, `attempts`, `nextAttemptAt` and `lastError`. Provider failure does not erase an order, quotation, contact message or partner application. After restoring delivery, confirmation links that expired require a fresh request. Approve and implement a retention schedule for operational messages and legally retained order data before release.

For `payment_review`, compare provider payment, order snapshots, exact batch eligibility and stock. Resolve through a documented fulfilment or refund procedure; do not mark paid to bypass missing batch evidence. Returned goods are not automatically added back to saleable stock. Backup the database before forward migrations, validate on staging and roll application code back only when it remains compatible with the applied schema.

## Measurement limits

Axe checks cover critical/serious findings beneath the age gate; keyboard, screen-reader and scientific editorial review still need human work. Per-route gzip budgets measure initial declared client chunks and keep optional 3D/PDF/admin chunks separate. They do not certify field Core Web Vitals. Measure LCP, INP and CLS with consent-respecting production data after release. Local embedding model tests and live AI/carrier/payment delivery checks are reported separately, never counted as critical checkout coverage. The enabled local model suite passed on this Intel Mac. A scoped ONNX Runtime 1.23.2 override supplies its missing native platform binding; re-evaluate the pin when upgrading Transformers or ONNX Runtime, and exercise the actual deployment architecture. The model is downloaded and cached on first use, rather than bundled. See the [upstream platform issue](https://github.com/microsoft/onnxruntime/issues/27961).


## Additional review commands

```sh
RUN_LOCAL_EMBED_TESTS=1 pnpm test
BASE_URL=http://localhost:3017 node scripts/performance-smoke.mjs /tmp/averian-performance-review
BASE_URL=http://localhost:3017 SCREENSHOT_LOCALE=fi node scripts/screenshot-mobile.mjs /tmp/averian-mobile-review
```

The browser tests create and remove their own marked users, plans and quotation records in the explicitly isolated database. They fail when database configuration is missing; critical storefront journeys are not silently skipped. Live AI provider tests remain conditional. A streamed Next.js not-found page can carry HTTP 200 after headers have been sent; the sharing test checks that revoked plan content is absent and its image endpoint returns 404, rather than treating a transport status alone as proof of privacy.

Making a plan private removes its activity events, filters stale share events from public queries, disables page caching and prevents shared-image caching. Personal account deletion removes the user's plan events along with the plans. Public product and batch records remain request-scoped and are never made saleable by static fixtures.

Newsletter registration uses double opt-in and queues its confirmation transactionally. Marketing delivery is not enabled. The displayed withdrawal route is support contact; implement an authenticated or signed unsubscribe route before enabling any campaign and include it in each marketing message. No monthly frequency is promised.

The research workspace adds private history/drafts and stricter pending-post visibility. Before restoring older code, verify that pending threads/posts remain private. Additive schema compatibility alone does not establish safe publication behavior. Preserve the latest private database snapshot and published deployment lock until the connected source branch is synchronized.


## 15 October follow-up: evidence and recovery

The [editorial and release review](RESEARCH_EDITORIAL_REVIEW_2026-10-15.md) records the terminology corrections, live-answer findings, controlled calculation explanations and recovery rehearsal. Seller details and original specifications/reports remain owner-supplied inputs; the owner will provide them later.

An application logical-snapshot restore was rehearsed against a new empty local database: 47 public tables, 125 rows, 6 matching migration hashes and 48 validated foreign keys. The source snapshot was checksum-verified, and an existing target was refused. This is narrower than a provider PITR/full-cluster rehearsal. Keep the original private snapshot, and approve backup retention and provider recovery before merchant launch.

To repeat against a suitable snapshot, create an empty local PostgreSQL/pgvector database named `averian_restore_rehearsal_*`. Supply `RESTORE_TEST_DATABASE_URL`, `RESTORE_SNAPSHOT_PATH` and `RESTORE_SNAPSHOT_SHA256` through the local environment, run `pnpm exec tsx scripts/rehearse-restore.ts`, inspect the aggregate result and remove that scratch database afterward. The script only accepts a local dedicated database and requires an exact migration revision; it never resets an existing target.

The live assistant evaluator defaults to an isolated local app with a matching local `TEST_DATABASE_URL`. The existing hosted review origin can be evaluated explicitly with `BASE_URL=https://averianlabs-demo.netlify.app AI_EVAL_TARGET=review AI_EVAL_OUTPUT=<new-evidence-path> pnpm ai:eval:research`. Hosted runs are anonymous, require noindex/nofollow and disable persistence, retrieval and write tools. They use the usual limits. A limited/unavailable run saves an incomplete checkpoint and exits 2; resume after recovery with `AI_EVAL_RESUME=1` and the same output path. A runtime/numerical pass still needs separate answer, source and language assessment. Keep baseline and post-fix runs separately identified.

The verified follow-up is published: see the [15 October deployment record](NETLIFY_DEPLOYMENT_2026-10-15.md) for exact source, final targeted assistant checks, independent public-domain verification and remaining release requirements. The full baseline and intermediate failed attempts remain separate evidence.
