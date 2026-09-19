# Environment Variable Checklist for Launch

This document tracks all environment variables required for production launch. Each variable is categorized by criticality and service.

## Critical (Must Have for Launch)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `DATABASE_URL` | Postgres connection string (Neon/pgvector) | Neon Console → Project → Connection Details | ❌ |
| `AUTH_SECRET` | Auth.js session encryption key (≥32 chars) | `openssl rand -base64 32` | ❌ |
| `AUTH_URL` | Canonical origin for Auth.js callbacks | `https://averianlabs.eu` | ❌ |
| `MINIMAX_API_KEY` | MiniMax API key for Averia chat | MiniMax Dashboard → API Keys | ❌ |
| `NEXT_PUBLIC_SITE_URL` | Public site URL for canonical URLs | `https://averianlabs.eu` | ❌ |

## Payments (Required for Checkout)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_*) | Stripe Dashboard → Developers → API Keys | ❌ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks | ❌ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_*) | Stripe Dashboard → Developers → API Keys | ❌ |
| `COINBASE_COMMERCE_WEBHOOK_SECRET` | Coinbase Commerce webhook secret | Coinbase Commerce → Settings → Webhooks | ❌ |

## Email & Notifications

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `RESEND_API_KEY` | Resend API key for transactional email | Resend Dashboard → API Keys | ❌ |
| `RESEND_FROM_EMAIL` | From address for emails | `orders@averianlabs.eu` (verified domain) | ❌ |

## Legal Identity (Required for EU Compliance)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `NEXT_PUBLIC_LEGAL_COMPANY_NAME` | Legal company name | Business registry | ❌ |
| `NEXT_PUBLIC_LEGAL_BUSINESS_ID` | Y-tunnus / Business ID | Finnish Patent and Registration Office | ❌ |
| `NEXT_PUBLIC_LEGAL_VAT_ID` | EU VAT ID (VIES verified) | Tax authority | ❌ |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE1` | Registered address line 1 | Business registry | ❌ |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE2` | Registered address line 2 | Business registry | ❌ |
| `NEXT_PUBLIC_LEGAL_EMAIL` | Legal contact email | `legal@averianlabs.eu` | ❌ |

## CMS & Content (Sanity)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID | Sanity Dashboard → Project Settings | ❌ |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset name | `production` | ✅ |
| `SANITY_API_TOKEN` | Sanity write token (for webhooks) | Sanity Dashboard → API → Tokens | ❌ |
| `SANITY_API_READ_TOKEN` | Sanity read token (for preview) | Sanity Dashboard → API → Tokens | ❌ |
| `SANITY_WEBHOOK_SECRET` | Sanity webhook verification secret | Generate: `openssl rand -hex 32` | ❌ |

## Media Storage (Cloudflare R2)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → R2 | ❌ |
| `R2_ACCESS_KEY_ID` | R2 access key ID | Cloudflare R2 → Manage API Tokens | ❌ |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key | Cloudflare R2 → Manage API Tokens | ❌ |
| `R2_BUCKET` | R2 bucket name | `averianlabs-media` | ✅ |
| `R2_PUBLIC_URL` | Public R2 URL (custom domain) | Cloudflare R2 → Custom Domains | ❌ |

## Search (Meilisearch)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `MEILI_HOST` | Meilisearch host URL | Meilisearch Cloud / Self-hosted | ❌ |
| `MEILI_API_KEY` | Meilisearch API key | Meilisearch Dashboard → API Keys | ❌ |

## Shipping (Sendcloud)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `SENDCLOUD_PUBLIC_KEY` | Sendcloud public key | Sendcloud Dashboard → Settings → API | ❌ |
| `SENDCLOUD_SECRET_KEY` | Sendcloud secret key | Sendcloud Dashboard → Settings → API | ❌ |
| `SENDCLOUD_WEBHOOK_SECRET` | Sendcloud webhook secret | Sendcloud Dashboard → Webhooks | ❌ |

## Analytics & Monitoring

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key | PostHog Dashboard → Project Settings | ❌ |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | `https://eu.i.posthog.com` | ✅ |
| `SENTRY_DSN` | Sentry DSN (server) | Sentry Dashboard → Settings → Projects | ❌ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (client) | Sentry Dashboard → Settings → Projects | ❌ |
| `SENTRY_ORG` | Sentry organization slug | Sentry URL: `https://sentry.io/org/<ORG>/` | ❌ |
| `SENTRY_PROJECT` | Sentry project slug | Sentry URL: `.../projects/<PROJECT>/` | ❌ |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (for source maps) | Sentry Dashboard → Settings → Auth Tokens | ❌ |

## Rate Limiting (Upstash Redis)

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Upstash Console → Database Details | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Upstash Console → Database Details | ❌ |

## Optional / Nice to Have

| Variable | Description | Where to Get | Status |
|----------|-------------|--------------|--------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Google Cloud Console → Credentials | ❌ |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Google Cloud Console → Credentials | ❌ |
| `CRON_SECRET` | Secret for cron job authentication | `openssl rand -base64 32` | ❌ |
| `MINIMAX_BASE_URL` | MiniMax API base URL | `https://api.minimax.io/v1` | ✅ |
| `MINIMAX_CHAT_MODEL` | MiniMax chat model | `MiniMax-M3` | ✅ |
| `MINIMAX_EMBEDDING_MODEL` | MiniMax embedding model | `text-embedding-MiniMax-M3` | ✅ |
| `MINIMAX_EMBEDDING_DIMENSIONS` | Embedding dimensions | `4096` (for MiniMax-M3) | ❌ |

## Verification Commands

```bash
# Check all required vars are set (run in production environment)
curl -fs https://averianlabs.eu/api/health | jq

# Expected "ok" status when all critical services configured:
# {
#   "status": "ok",
#   "checks": {
#     "env": true,
#     "db": true,
#     "minimax": true,
#     "auth": true
#   }
# }

# Test Averia chat (requires MINIMAX_API_KEY)
curl -N -fs -X POST -H 'content-type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user","content":"hi"}]}' \
  https://averianlabs.eu/api/ai/chat

# Test Sanity webhook
curl -X POST https://averianlabs.eu/api/webhooks/sanity \
  -H "x-sanity-secret: $SANITY_WEBHOOK_SECRET" \
  -H "content-type: application/json" \
  -d '{"_type":"post","slug":{"current":"test"}}'

# Test Stripe webhook (requires Stripe CLI)
stripe listen --forward-to https://averianlabs.eu/api/webhooks/stripe
```

## Deployment Scopes

Set environment variables in **all three scopes** on Vercel/Netlify:

| Scope | Purpose | Variables |
|-------|---------|-----------|
| **Production** | Live site | All critical + payment + legal |
| **Preview** | PR deployments | All except production secrets (use test keys) |
| **Branch** | Feature branches | Minimal set (DATABASE_URL, AUTH_SECRET, MINIMAX_API_KEY) |

## Pre-Launch Validation

Run this checklist before every production deploy:

- [ ] All **Critical** variables set in Production scope
- [ ] All **Payment** variables set with live keys
- [ ] All **Legal** variables set with real business IDs
- [ ] `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` match production domain
- [ ] `MINIMAX_EMBEDDING_DIMENSIONS=4096` set
- [ ] `SANITY_WEBHOOK_SECRET` matches Sanity webhook config
- [ ] `UPSTASH_REDIS_REST_URL/TOKEN` set for distributed rate limiting
- [ ] `SENTRY_DSN` configured for error tracking
- [ ] Health check returns `status: "ok"`
- [ ] Averia chat responds correctly
- [ ] Stripe webhook receives test events
- [ ] Sanity webhook receives test events
- [ ] Email delivery works (test registration flow)
- [ ] Rate limiting works across multiple instances