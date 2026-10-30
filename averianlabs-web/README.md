# AverianLabs — Research materials and tools

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + React Three Fiber.

## Deployment targets

The live site is [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app). It runs the full Next.js application with the site's configured database and secrets, and it accepts real orders: the merchant release is approved and the `noindex` review gate has been removed from the build environment, the response headers, `robots.txt` and the page metadata.

The custom domain `averianlabs.eu` is **not registered** — EURid reports it as available and it has no name servers. The canonical origin, the sitemap and the `robots.txt` sitemap reference therefore resolve from the deployment (`lib/seo/site-origin.ts`) rather than naming a domain nobody owns. Connect the domain and set `NEXT_PUBLIC_SITE_URL` and all of them follow it.

| Target | URL | What it is | Build mode | `X-Robots-Tag` |
|---|---|---|---|---|
| **Planned canonical production** | `https://averianlabs.eu` | The domain is not registered yet (EURid reports it available and it has no name servers). Connect it and set `NEXT_PUBLIC_SITE_URL`; every canonical URL, sitemap entry and robots.txt reference follows it. | Full server runtime | None — indexable |
| **Live site** | `https://averianlabs-demo.netlify.app` | The full application, serving real orders. The merchant release is approved and the review-site gate has been removed. | Next.js Runtime plugin, hosted build | None — indexable |

The repository-root `netlify.toml` sets the monorepo base directory. Hosted builds check the database migration ledger, apply forward migrations and insert missing draft references without overwriting existing records, then build the app and check bundle budgets. Private routes retain the application's cache headers.

See [the release runbook](docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md) before enabling real orders. The existing Netlify Git connection tracks `demo`; a hosted source archive can deploy the current local snapshot when GitHub write access is unavailable.

See the current [site experience plan](docs/SITE_EXPERIENCE_MASTER_PLAN_2026-10-15.md), [implementation ledger](docs/SITE_EXPERIENCE_IMPLEMENTATION_2026-10-15.md) and [15 October release record](docs/NETLIFY_EXPERIENCE_DEPLOYMENT_2026-10-15.md) for the exact published source, verification, private backup checksums, publication lock and remaining approvals.

## Toolchain

Use Node **24.22.0** and pnpm **10.0.0** for local development and builds. Root/app `.node-version`, CI and build configuration pin that toolchain. Managed hosting selects Node 24 for Functions; the release record verifies its actual serving patch separately rather than inferring it from the build version.

## Quick start (one command)

```bash
# Production server on http://localhost:3000
./scripts/deploy-local.sh

# Hot-reload dev server
./scripts/deploy-local.sh --dev

# Drop & re-seed the database
./scripts/deploy-local.sh --reset-db

# Stop everything
./scripts/deploy-local.sh --down
```

The script handles: Docker Postgres (pgvector) on :5434, pnpm install,
Drizzle schema push, 15-product seed, and either `pnpm dev` or a
production build + `pnpm start`.

## Stack

- **Framework**: Next.js 15 (RSC, Server Actions)
- **3D**: React Three Fiber + drei + postprocessing
- **DB**: Postgres (pgvector) + Drizzle ORM
- **Auth**: Auth.js v5
- **CMS**: Sanity
- **Payments**: Stripe + Coinbase Commerce
- **i18n**: next-intl 4 (en, fi, sv, ru) — Finland-only storefront, EUR in every locale
- **Shipping**: Sendcloud
- **Search**: Meilisearch
- **Hosting**: Netlify full application for online review; canonical custom domain and merchant release remain pending

## Architecture

```
app/[locale]/        → All routes are locale-prefixed (en, fi, sv, ru)
components/three/    → The signature 3D carousel (R3F)
db/schema/           → Drizzle schema (Postgres)
lib/                 → Auth, payments, i18n, shipping, VAT, etc.
messages/            → Translation catalogues
sanity/schemas/      → Sanity content models
scripts/             → Local deploy, seed, and AI eval
```

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm typecheck` | TS strict |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome autofix |
| `pnpm test` | Vitest unit tests |
| `pnpm test:integration` | Vitest against the isolated database |
| `pnpm test:e2e` | Playwright browser suite (needs `TEST_DATABASE_URL` — see below) |
| `pnpm test:a11y` | axe-core accessibility smoke (needs a running server) |
| `pnpm check:narrow` | Fail if any page overflows a 320px viewport |
| `pnpm perf` | Storefront weight/LCP benchmark (run against a production server) |
| `pnpm check:i18n` | Locale key parity, Finnish-leak guard, route namespace scope |
| `pnpm check:i18n:slice` | Fail if the browser message slice is stale |
| `pnpm check:i18n:usage` | Fail if a `t("…")` call names a key no locale has |
| `pnpm i18n:slice` | Regenerate the browser message slice |
| `pnpm legal:check` | Fail if a `NEXT_PUBLIC_LEGAL_*` value is still a placeholder |
| `pnpm db:push` | Push schema to Postgres |
| `pnpm db:studio` | Drizzle Studio (DB UI) |
| `pnpm db:seed` | Seed 15 placeholder SKUs |
| `pnpm studio` | Sanity Studio |
| `./scripts/deploy-local.sh --prod` | Build + run prod on :3000 |
| `./scripts/deploy-local.sh --dev` | Run dev server on :3000 |
| `./scripts/deploy-local.sh --reset-db` | Drop + re-create + re-seed |
| `./scripts/deploy-local-test.sh` | **The one to use for testing** — see below |

## Storefront performance

`pnpm perf` measures what a visitor actually downloads and waits for, per
route, against a running production server:

```bash
pnpm build && pnpm start
pnpm perf
```

| Route | HTML | JS | CSS | Fonts | Total | LCP | CLS |
|---|---|---|---|---|---|---|---|
| `/en` | 45 KB | 170 KB | 16 KB | 68 KB | **300 KB** | 116 ms | 0 |
| `/en/shop` | 39 KB | 170 KB | 16 KB | 68 KB | **294 KB** | 124 ms | 0 |
| `/en/shop/[slug]` | 37 KB | 173 KB | 16 KB | 68 KB | **294 KB** | 92 ms | 0 |
| `/en/checkout/cart` | 40 KB | 172 KB | 16 KB | 68 KB | **296 KB** | 68 ms | 0 |

What keeps it there:

- **Sentry is not on the critical path.** `@sentry/nextjs` is ~105 KiB
  gzipped and used to be imported statically by `instrumentation-client.ts`.
  `lib/observability/client-reporter.ts` loads it on demand, the first time an
  error has to be reported. Session Replay is off unless
  `NEXT_PUBLIC_SENTRY_REPLAYS=true`.
- **The browser message payload is scoped per route.** A single global list
  of namespaces put ~81 KiB of JSON into every page. `lib/i18n/client-namespaces`
  resolves the set from the request path, and `lib/i18n/client-message-slice`
  keeps only the keys the browser reads from the large namespaces.
  `scripts/check-i18n-route-scope.mjs` proves every route ships what it
  renders.
- **The catalogue is trimmed before it reaches the browser.**
  `lib/products/client-catalogue.ts` drops the fields no client component
  reads, and the full catalogue stays on the server.
- **One webfont, preloaded.** The brand face lives in `public/fonts` and is
  preloaded from the head; a dynamic route never emits the preload for a
  `next/font` face.
- **The catalogue is cached.** `getStorefrontCatalogue` is cached for a
  minute and revalidated by tag, so a page render does not run seven
  database queries. Order creation still re-reads the database.

## Translations and narrow viewports

Four locales ship: `en`, `fi`, `sv`, `ru`. The store is Finland-only and every
locale prices in EUR.

The translation work is guarded by four checks, because a copy defect in a
non-English locale is invisible to the rest of the suite:

| Check | What it catches |
|---|---|
| `pnpm check:i18n` | A key that exists in one locale and not another, Finnish copy leaking into another locale, and a route that ships a namespace it renders |
| `pnpm check:i18n:usage` | A `t("…")` call naming a key that no locale defines |
| `pnpm check:i18n:slice` | A stale browser allowlist, which would silently drop a message at runtime |
| `pnpm check:narrow` | A page that scrolls sideways on a 320px phone |

The narrow check exists because a translated string is routinely longer than
the English it replaces, and Finnish and Swedish build long compound words
("Laboratoriotutkimusta", "tutkimusorganisaatioille"). A single such word in a
large heading was enough to push the whole page past the viewport. Headings
now break with `overflow-wrap` and hyphenate where the browser has a
dictionary for the language; the announcement bar drops the message that no
longer fits instead of painting over its neighbour.

`scripts/runtime-audit.mjs` is the end-to-end check: it walks every route in
every locale against a running server and fails on a console error, an
uncaught exception, a failed request, a non-2xx response, a missing
translation or an uninterpolated `{placeholder}`.

```bash
pnpm build && pnpm start
node scripts/runtime-audit.mjs
```


## Running the site for testing

```bash
./scripts/deploy-local-test.sh            # build + run the production server on :3000
./scripts/deploy-local-test.sh --dev      # the same, with hot reload
./scripts/deploy-local-test.sh --reset   # drop the test database and re-create it
./scripts/deploy-local-test.sh --stop    # stop the server
```

It starts Postgres, migrates the schema, seeds the catalogue, builds and starts the
server. The seed is deliberately different from `pnpm db:seed`.

`pnpm db:seed` writes the reference products as **drafts with no prices and no
batches**, because the supplier evidence for them does not exist. That is correct for a
database that might hold real orders, and it means nothing can be bought. The test seed
(`pnpm db:seed-local-demo`) promotes the same catalogue into a locally orderable state:
active products, prices, stock, a released batch per variant and a public certificate
per batch. Everything it writes is marked `local-demo-fixture` so it can never be
mistaken for supplier evidence, and it refuses to run against anything but a local
database.

The surfaces to try:

| Surface | Where |
| --- | --- |
| Storefront | http://localhost:3000/en/shop |
| Product page | http://localhost:3000/en/shop/bpc-157 |
| Admin console | http://localhost:3000/en/admin/orders |
| Admin inventory | http://localhost:3000/en/admin/inventory |
| Crypto checkout | choose "Cryptocurrency" at the payment step |
| Health | http://localhost:3000/api/health |

Promotion codes: `RESEARCH10` (10 % off over €50), `WELCOME15` (15 % off over €100),
`FREESHIP` (free delivery).

The admin console needs an account with the `admin` role. Create one through
`/en/account`, then:

```bash
psql "$DATABASE_URL" -c "update users set role='admin' where email='you@example.com'"
```

`next start` prints a warning about `output: "standalone"`. It is expected and harmless
locally — the server serves correctly. The hosted deployment uses the Netlify plugin,
not `next start`.

## Manual setup

If you'd rather wire each piece yourself:

```bash
pnpm install
cp .env.example .env.local           # edit values
docker run -d --name averianlabs-postgres \
  -e POSTGRES_USER=averianlabs -e POSTGRES_PASSWORD=averianlabs \
  -e POSTGRES_DB=averianlabs \
  -p 5434:5432 pgvector/pgvector:pg16
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  pnpm db:push
DATABASE_URL=postgres://averianlabs:averianlabs@localhost:5434/averianlabs \
  pnpm db:seed
pnpm dev
```

Open http://localhost:3000 — you'll be redirected to `/en` by default.

### Running the tests

The browser suite mutates the database, so it needs an isolated one. Put both
variables in `.env.local`, pointing at the same database:

```bash
DATABASE_URL="postgres://averianlabs:averianlabs@localhost:5434/build"
TEST_DATABASE_URL="postgres://averianlabs:averianlabs@localhost:5434/build"
```

The database name must be `averian_reliability` or `build`. `playwright.config.ts`
reads `.env.local` itself and refuses to start with a clear message if the
variable is missing or does not match `DATABASE_URL`, rather than letting every
test fail with an unrelated error. `pnpm test:e2e` then works from a clean
checkout.

The database name is restricted to those two on purpose: a typo must never point
the suite at production.

## Environment

Default `.env.local` ships with safe stubs so the site is fully
runnable without any external accounts:

- Auth + DB → local Postgres on :5434
- Stripe / Coinbase / Sendcloud / R2 / Meilisearch / Resend → empty (flows stub)
- Sanity → empty (blog falls back to local catalogue)
- PostHog / Plausible / Sentry → empty (telemetry disabled)
- AI (`MINIMAX_API_KEY`) → optional; without it, the chat widget shows a polite error.

See `.env.example` for the full list.

## Averia ops (AI)

| Task | Command / setup |
|---|---|
| Index catalog + glossary + blog into pgvector | `pnpm ai:index` (fails if any chunk lacks an embedding) |
| Retrieval eval (recall@6 over ~240 goldens) | `pnpm ai:eval` (auto-skips without `DATABASE_URL` + `MINIMAX_API_KEY`) |
| Accessibility smoke (axe, 8 routes) | `pnpm test:a11y` (server must be running) |
| Admin AI metrics | `GET /api/admin/ai/metrics` (admin session) |
| Sanity reindex webhook | `POST /api/webhooks/sanity` with header `x-sanity-secret: $SANITY_WEBHOOK_SECRET`; filter `_type in ["glossaryTerm","post"]` |

Embedding requests are batched (16 texts/request) and spaced for MiniMax's 1 RPM limit — a full index is a handful of requests instead of one per chunk.

### Setting the MiniMax API key on Netlify

The Netlify deploy runs the full Next.js app via `@netlify/plugin-nextjs`,
so `app/api/ai/chat` executes as a Node Function. Set the key under
**Site settings → Environment variables**, with the **Functions** scope and the
intended deploy contexts below. The value is read at function invocation, never
written to the bundle, and never visible to the browser:

| Deploy context | When it applies |
|---|---|
| Production | Production-context deployments, including the live site and source-archive releases. |
| Preview | Every pull-request deploy. Use a separate, rate-limited key so PR forks can't burn your credits. |
| Branch | Any non-main branch with `Branch deploys` enabled (e.g. `feature/*`). |

After saving, redeploy. `curl -fs https://<netlify-url>/api/health` verifies
general environment/database readiness; it does not prove that the optional AI
provider key is configured or that the provider responds. Verify an actual
assistant reply separately. The chat widget's `/api/ai/chat` returns 503
`provider_unavailable` until the key is set.

**Never** commit `MINIMAX_API_KEY=…` with a non-empty value; the lefthook
pre-commit `secret-guard` rejects such diffs before they land. The
placeholder line in `.env.example` (`MINIMAX_API_KEY=""`) is allowed and
documents the variable name without leaking a real key.
