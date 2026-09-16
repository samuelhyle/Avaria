# AverianLabs — Production Runbook

Keep this file with the deployment. It is the first thing to open during an
incident and the last thing to update before a release.

## Environments

| Env | Host | URL | DB | Notes |
|---|---|---|---|---|
| Production | Vercel | https://averianlabs.eu | Neon primary | Single-region (Vercel default); auto-scale. |
| Staging | Vercel preview | https://staging.averianlabs.eu | Neon branch (copy of prod, reset weekly) | Created on every push to `main`. |
| Local | Docker compose | http://localhost:3000 | `averianlabs:averianlabs@postgres:5432` | Used for reproductions; matches prod schema. |

## Contacts

| Role | Person | Channel |
|---|---|---|
| On-call engineer | (assign in PagerDuty) | #oncall (Slack) |
| Product owner | (fill in) | product@averianlabs.eu |
| Stripe support | https://support.stripe.com | billing@averianlabs.eu |
| Neon support | https://neon.tech | (in-app chat) |
| Resend support | https://resend.com | (in-app chat) |

## Deploy

Production deploys are GitHub pushes to `main` → Vercel build → automatic
promotion. The CI workflow (`.github/workflows/ci.yml`) must pass.

If a manual deploy is needed:

```sh
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

The release step on Vercel runs `pnpm db:migrate` before swapping traffic. If a
migration fails, Vercel rolls back the build automatically — verify the prior
release is healthy with the runbook checks below.

## Health checks

`/api/health` returns a JSON body with `checks.env` and `checks.db`. The Docker
container has an identical `HEALTHCHECK` hitting the same endpoint.

```sh
curl -fs https://averianlabs.eu/api/health | jq
# → { "status": "ok", "checks": { "env": true, "db": true }, ... }
```

If `status` is `degraded`, check the failure in `checks` and the most recent
deploy log.

## Common incidents

### Checkout fails with "Checkout failed. Please try again."
1. Hit `/api/health` — if `db: false`, follow the DB incident below.
2. Open Stripe Dashboard → Logs → look for 5xx in the last 15 min.
3. If Stripe is healthy and DB is healthy, replay the webhook:
   `Stripe Dashboard → Events → click event → Resend`. Confirm with the customer.

### Login returns 500 or "Configuration"
The most common cause is a missing `AUTH_SECRET` or `AUTH_URL`. Run
`pnpm exec tsc --noEmit` (or open the deploy logs) and confirm both env vars
are set. The login page will render with an English fallback instead of the
configured locale if `AUTH_URL` doesn't match the deployed origin.

### DB connection failures (Neon)
1. Neon Dashboard → Operations → check for an active incident.
2. If the pooled endpoint is overloaded, scale the pool (Settings → Connection
   pooling).
3. Roll back the most recent migration:
   ```sh
   psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 3"
   ```
   Roll forward a no-op migration if you need to unblock deploys.

### Webhook events missing
Both Stripe and Coinbase webhooks write to `webhook_events` (`/api/health` does
not check this — query it directly):
```sh
psql "$DATABASE_URL" -c "SELECT provider, count(*) FROM webhook_events WHERE received_at > now() - interval '1 hour' GROUP BY 1"
```
If a provider shows zero recent events:
1. Confirm the webhook endpoint returns 200 from the provider's dashboard.
2. Replay the most recent event from the provider's dashboard.
3. If replay fails, inspect Vercel function logs for `webhook_events` insert
   errors.

## Routine operations

### Roll back a deploy
Vercel → Deployments → pick the previous green build → Promote to Production.
Then run any schema-related fixes manually (Vercel doesn't run down-migrations).

### Rotate a secret
1. `AUTH_SECRET`: generate `openssl rand -base64 32`, update Vercel env, redeploy.
   All existing sessions invalidate. Communicate via status banner.
2. `STRIPE_SECRET_KEY`: roll in Stripe Dashboard, update Vercel env, redeploy.
   No downtime. Test a sandbox payment immediately.
3. `CRON_SECRET`: generate new value, update Vercel env, update the cron job's
   bearer credential in the scheduler.
4. `MINIMAX_API_KEY`: roll a new key in the MiniMax dashboard, paste it into
   **Netlify → Site settings → Environment variables → Production** (and the
   matching Preview / Branch values if they exist), then redeploy. The
   lefthook `secret-guard` hook rejects any commit that stages a non-empty
   value, so this rotation never writes the key to git. After redeploy,
   `curl -fs https://<netlify-url>/api/health | jq .checks.env` must return
   `true` and `/api/ai/chat` must answer a 1-token probe without 503.

### Restore the database
For Vercel/Neon, use the Neon PITR restore (Projects → Restore). Note the
timestamp before you start and confirm with the product owner — every restore
overwrites production data.

For self-hosted deployments:
```sh
BACKUP_DIR=/var/backups/averianlabs ./scripts/backup-db.sh
# restores happen via:
pg_restore --clean --dbname "$DATABASE_URL" /var/backups/averianlabs/averianlabs-YYYYMMDDTHHMMSSZ.dump
```

### Replay a Stripe webhook
Stripe Dashboard → Events → click the event → Resend. The handler is
idempotent (`webhook_events` ledger) so a duplicate replay is safe.

### Run an AI eval
```sh
MINIMAX_API_KEY=... pnpm ai:eval
```
Skipped in CI when the key is absent — that's expected for forks.

## Monitoring

| Signal | Source | Alert threshold |
|---|---|---|
| 5xx rate | Sentry (Next 15.5 routes report) | > 0.5% over 5 min |
| `payment_intent.succeeded` failures | Stripe dashboard | any |
| AI spend / day | MiniMax usage page | 2× baseline |
| DB pool saturation | Neon metrics | > 80% sustained 5 min |
| Rate-limit 429 rate | Vercel logs (`429` grep) | sustained spike |
