#!/usr/bin/env bash
# Bring up the AverianLabs storefront locally for testing.
#
#   ./scripts/deploy-local-test.sh            # build and run the production server
#   ./scripts/deploy-local-test.sh --dev      # run the dev server with hot reload
#   ./scripts/deploy-local-test.sh --reset   # drop and re-create the test database
#   ./scripts/deploy-local-test.sh --stop    # stop the server
#
# What it does:
#   1. starts the Postgres container
#   2. migrates the schema and seeds a fully orderable catalogue
#   3. builds the site and starts it on :3000
#
# The seed is deliberately different from `pnpm db:seed`: the ordinary seed
# writes the reference products as drafts with no prices and no batches,
# because the supplier evidence for them does not exist. Nothing could be
# bought. This one marks every product as local demo fixture data so the
# whole buying flow can be exercised locally.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
DB_NAME="${DB_NAME:-build}"
DB_USER="${DB_USER:-averianlabs}"
DB_PASSWORD="${DB_PASSWORD:-averianlabs}"
DB_PORT="${DB_PORT:-5434}"
CONTAINER="${CONTAINER:-averianlabs-postgres}"
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
TEST_DATABASE_URL="$DATABASE_URL"
export DATABASE_URL TEST_DATABASE_URL

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

stop_server() {
  if lsof -ti:"$PORT" >/dev/null 2>&1; then
    log "Stopping the server on :$PORT"
    lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
  fi
}

start_postgres() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    ok "Postgres is running"
    return
  fi
  log "Starting Postgres"
  docker start "$CONTAINER" >/dev/null 2>&1 || die "Could not start $CONTAINER"
  for _ in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      ok "Postgres is ready"
      return
    fi
    sleep 1
  done
  die "Postgres did not become ready"
}

reset_database() {
  warn "Recreating the ${DB_NAME} database"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" >/dev/null
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};" >/dev/null
}

prepare_database() {
  log "Migrating the schema"
  pnpm db:migrate >/dev/null
  log "Seeding the reference catalogue"
  pnpm db:seed >/dev/null
  log "Making the catalogue orderable (local demo fixture data)"
  pnpm db:seed-local-demo >/dev/null
  log "Seeding the promotion codes"
  pnpm db:seed-promotions >/dev/null
  ok "Database ready: ${DB_NAME} on :${DB_PORT}"
}

case "${1:-}" in
  --stop)
    stop_server
    exit 0
    ;;
  --reset)
    stop_server
    start_postgres
    reset_database
    prepare_database
    ;;
  ""|--prod|--dev)
    ;;
  *)
    die "Unknown argument: $1. Use --dev, --prod, --reset or --stop."
    ;;
esac

start_postgres
stop_server

if [ "${1:-}" != "--reset" ]; then
  # The schema and the seed are idempotent, so a plain start refreshes the
  # catalogue without touching the data.
  prepare_database
fi

if [ "${1:-}" = "--dev" ]; then
  log "Starting the dev server on :$PORT"
  PORT="$PORT" pnpm dev
  exit 0
fi

log "Building"
pnpm build >/dev/null
log "Starting the production server on :$PORT"
PORT="$PORT" HOSTNAME=0.0.0.0 pnpm start &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' INT TERM

for _ in $(seq 1 60); do
  if curl -fs -o /dev/null "http://localhost:${PORT}/api/health"; then
    ok "The storefront is live at http://localhost:${PORT}"
    break
  fi
  sleep 1
done

cat <<'BANNER'

  Test accounts and surfaces

  Storefront          http://localhost:3000/en/shop
  Product page        http://localhost:3000/en/shop/bpc-157
  Admin console       http://localhost:3000/en/admin/orders
  Admin inventory     http://localhost:3000/en/admin/inventory
  Crypto checkout     pick "Cryptocurrency" at the payment step
  Health              http://localhost:3000/api/health

  Promotion codes     RESEARCH10 (10 % off over €50)
                       WELCOME15  (15 % off over €100)
                       FREESHIP   (free delivery)

  Sign in with any account you create. To reach the admin console, promote
  the account in the database:

    psql "$DATABASE_URL" -c "update users set role='admin' where email='…'"

BANNER

wait $SERVER_PID
