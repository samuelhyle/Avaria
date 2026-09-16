# AverianLabs — Premium Research Peptide Webstore

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + React Three Fiber.

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
- **Hosting**: Vercel (fra1) + Cloudflare

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

### Netlify deployment (graceful degradation)

`netlify.toml` runs the full Next.js app via `@netlify/plugin-nextjs`
`(output: "standalone"`, app/api routes ship as Node Functions, middleware
runs at the edge). The bundle is built to **stay live even when most
integrations aren't configured** — DB / auth / payment modules load cleanly
and the affected routes degrade instead of crashing:

| Env var | Without it on Netlify | With it on Netlify |
|---|---|---|
| `MINIMAX_API_KEY` | Chat widget shows the "Averia is offline" message; `/api/ai/chat` returns 503 `provider_unavailable`. Everything else works. | `/api/ai/chat` streams real answers. |
| `NEXT_PUBLIC_SITE_URL` | Middleware still redirects `/` → `/en`, but canonical-URL metadata uses the request host. | Set to `https://<your-site>.netlify.app` for canonical OG/JSON-LD URLs. |
| `DATABASE_URL` | Marketing/catalog/blog/AI-chat work fully. `/api/health` reports `degraded`. Account, checkout, forum, newsletter, partner, GDPR endpoints return 503. | Full app — accounts, orders, community, etc. |
| `AUTH_SECRET` (≥32 chars) | Same as no DATABASE_URL for the auth surface. Cookie-based login is disabled; auth endpoints return 503. | Real Auth.js sessions. |
| `AUTH_URL` | Same as no AUTH_SECRET. | Set to `https://<your-site>.netlify.app` so Auth.js derives the canonical origin. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `/api/checkout` returns 503. | Real Stripe checkout + webhook. |
| `RESEND_API_KEY` | Registration / password-reset confirmations aren't emailed (the DB row is still created if DB is also configured). | Real transactional email. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry SDK no-ops at boot. | Real error reporting. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Each function uses an in-memory rate limiter (works per-instance only). | Distributed rate limiting across all function instances. |

Set env vars under **Site settings → Environment variables → Production /
Preview / Branch** scopes as appropriate.

Verify the deploy with:

```sh
curl -fs https://<netlify-url>/api/health | jq
# → { "status": "degraded", "checks": { "env": true, "db": false, "minimax": true, "auth": false }, ... }
# `status` flips to "ok" once DATABASE_URL is set and reachable.
```

Averia chat smoke test (with `MINIMAX_API_KEY` set):

```sh
curl -N -fs -X POST -H 'content-type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user","content":"hi"}]}' \
  https://<netlify-url>/api/ai/chat
# → data: {"type":"text","delta":"Hello — I'm Averia, ..."}
```

**Never** commit `MINIMAX_API_KEY=…` with a non-empty value; the lefthook
pre-commit `secret-guard` rejects such diffs before they land. The
placeholder line in `.env.example` (`MINIMAX_API_KEY=""`) is allowed and
documents the variable name without leaking a real key.