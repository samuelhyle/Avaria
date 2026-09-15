#!/usr/bin/env bash
# Bring up the AverianLabs local stack end-to-end.
#
# 1. Ensures pnpm deps + Postgres + DB schema + 15 product SKUs.
# 2. Launches the production Next.js server (or `pnpm dev` for hot reload).
#
# Usage:
#   ./scripts/deploy-local.sh                # build + start prod server
#   ./scripts/deploy-local.sh --dev          # pnpm dev (Turbopack, hot reload)
#   ./scripts/deploy-local.sh --reset-db     # drop + re-create + re-seed
#   ./scripts/deploy-local.sh --down         # stop the running containers

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5434}"
POSTGRES_USER="${POSTGRES_USER:-averianlabs}"
POSTGRES_PASS="${POSTGRES_PASS:-averianlabs}"
POSTGRES_DB="${POSTGRES_DB:-averianlabs}"
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASS}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

ok() {
  printf '\033[1;32m✓\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m!\033[0m %s\n' "$*"
}

die() {
  printf '\033[1;31m✗\033[0m %s\n' "$*" >&2
  exit 1
}

ensure_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is required for local Postgres. Install Docker Desktop or point POSTGRES_HOST at an existing Postgres."
}

postgres_ready() {
  docker exec averianlabs-postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1
}

start_postgres() {
  if docker ps --format '{{.Names}}' | grep -q '^averianlabs-postgres$'; then
    ok "Postgres container already running"
    return
  fi
  log "Starting Postgres container…"
  docker run -d \
    --name averianlabs-postgres \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASS" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "${POSTGRES_PORT}:5432" \
    --restart unless-stopped \
    pgvector/pgvector:pg16 >/dev/null
  for _ in $(seq 1 30); do
    if postgres_ready; then
      ok "Postgres ready on :${POSTGRES_PORT}"
      return
    fi
    sleep 1
  done
  die "Postgres failed to become ready in 30s"
}

stop_all() {
  log "Stopping AverianLabs stack…"
  if docker ps --format '{{.Names}}' | grep -q '^averianlabs-web$'; then
    docker stop averianlabs-web >/dev/null 2>&1 || true
    docker rm averianlabs-web >/dev/null 2>&1 || true
    ok "Stopped averianlabs-web container"
  fi
  if docker ps --format '{{.Names}}' | grep -q '^averianlabs-postgres$'; then
    docker stop averianlabs-postgres >/dev/null 2>&1 || true
    docker rm averianlabs-postgres >/dev/null 2>&1 || true
    ok "Stopped averianlabs-postgres container"
  fi
  # Kill anything else bound to :3000
  if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -ti:3000 2>/dev/null || true)"
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
      ok "Killed stray process(es) on :3000"
    fi
  fi
}

reset_db() {
  warn "Resetting database ${POSTGRES_DB}…"
  docker exec averianlabs-postgres psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" >/dev/null
  docker exec averianlabs-postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};" >/dev/null
  ok "Database reset"
}

install_deps() {
  if [ ! -d node_modules ]; then
    log "Installing pnpm dependencies…"
    pnpm install --frozen-lockfile
  else
    ok "node_modules present"
  fi
}

push_schema() {
  log "Applying Drizzle migrations to ${DATABASE_URL}…"
  if ! DATABASE_URL="$DATABASE_URL" pnpm db:migrate; then
    die "Migrations failed. If this database was created with 'drizzle-kit push', run ./scripts/deploy-local.sh --reset-db once to rebaseline."
  fi
}

seed_db() {
  log "Seeding 15 placeholder SKUs…"
  DATABASE_URL="$DATABASE_URL" pnpm db:seed
}

start_dev() {
  log "Starting pnpm dev (Turbopack)…"
  DATABASE_URL="$DATABASE_URL" pnpm dev
}

build_and_start() {
  log "Building production bundle…"
  pnpm build
  log "Starting production server…"
  DATABASE_URL="$DATABASE_URL" HOSTNAME=0.0.0.0 PORT=3000 pnpm start
}

start_docker_prod() {
  log "Building & starting Docker stack…"
  docker compose up -d --build
  log "Waiting for healthcheck on http://localhost:3000/en …"
  for _ in $(seq 1 60); do
    if curl -fs -o /dev/null http://localhost:3000/en; then
      ok "Site is live at http://localhost:3000"
      return
    fi
    sleep 1
  done
  warn "Did not pass healthcheck in 60s; check 'docker compose logs -f web'"
}

case "${1:-}" in
  --down)
    stop_all
    exit 0
    ;;
  --reset-db)
    ensure_docker
    start_postgres
    reset_db
    install_deps
    push_schema
    seed_db
    ok "Database reset + seeded. Start the site with: ./scripts/deploy-local.sh"
    exit 0
    ;;
  --dev)
    ensure_docker
    start_postgres
    install_deps
    push_schema
    seed_db
    start_dev
    exit 0
    ;;
  --docker)
    ensure_docker
    start_postgres
    install_deps
    push_schema
    seed_db
    start_docker_prod
    exit 0
    ;;
  ""|--prod)
    ensure_docker
    start_postgres
    install_deps
    push_schema
    seed_db
    build_and_start
    exit 0
    ;;
  *)
    die "Unknown argument: $1. Use --dev, --prod, --docker, --reset-db, or --down."
    ;;
esac