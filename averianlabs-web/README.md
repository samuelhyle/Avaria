# AverianLabs — Research materials and tools

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + React Three Fiber.

## Deployment targets

The existing online project is [averianlabs-demo.netlify.app](https://averianlabs-demo.netlify.app). It runs the full Next.js application with the site's configured database and secrets and remains a `noindex` review site. The custom domain `averianlabs.eu` was not resolving during the 13 October 2026 deployment check; its production setup and merchant release approval are still pending.

| Target | URL | What it is | Build mode | `X-Robots-Tag` |
|---|---|---|---|---|
| **Planned canonical production** | `https://averianlabs.eu` | Requires domain/hosting setup and the release approvals in the runbook | Full server runtime | Set when approved |
| **Existing online review site** | `https://averianlabs-demo.netlify.app` | Full application for stakeholder review; no merchant release approval | Next.js Runtime plugin, hosted build | `noindex, nofollow` |

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
- **i18n**: next-intl 4 (en, fi, de, sv, nl)
- **Shipping**: Sendcloud
- **Search**: Meilisearch
- **Hosting**: Netlify full application for online review; canonical custom domain and merchant release remain pending

## Architecture

```
app/[locale]/        → All routes are locale-prefixed (en, fi, de, ...)
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
| `pnpm db:push` | Push schema to Postgres |
| `pnpm db:studio` | Drizzle Studio (DB UI) |
| `pnpm db:seed` | Seed 15 placeholder SKUs |
| `pnpm studio` | Sanity Studio |
| `./scripts/deploy-local.sh --prod` | Build + run prod on :3000 |
| `./scripts/deploy-local.sh --dev` | Run dev server on :3000 |
| `./scripts/deploy-local.sh --reset-db` | Drop + re-create + re-seed |

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
| Production | Production-context deployments, including the current review site and source-archive releases. |
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
