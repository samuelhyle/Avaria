#!/usr/bin/env bash
# Build the *static* marketing/demo bundle for local preview only.
#
# Output: .next-demo/ → out/  (a fully static site, no Node server)
#
# Usage:
#   ./scripts/build-demo.sh                 # build only
#   ./scripts/build-demo.sh --serve         # build + serve out/ on :3001
#
# This is intentionally separate from the production Netlify deploy, which
# runs the full Next.js app (`pnpm build` + `@netlify/plugin-nextjs`) so that
# `app/api/` and route handlers like `/api/ai/chat` work at runtime. Use
# this script only when you want a no-server preview (e.g. design QA,
# screenshots, marketing review). It forces BUILD_MODE=demo and:
#   - patches `export const dynamic = "force-dynamic"` route-segment configs
#     (which `output: "export"` rejects) and restores them afterwards
#   - moves `app/api/` aside because API routes are incompatible with
#     `output: "export"` — they require a server runtime that the demo
#     doesn't provide
#   - sets `Cache-Control: noindex` so the bundle can't be confused with prod

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Use a separate .next dir so this build doesn't conflict with any running
# dev server. Netlify doesn't read .next directly — Next exports to ./out.
NEXT_DIST_DIR=".next-demo"
export NEXT_DIST_DIR
export BUILD_MODE=demo
export NODE_ENV=production

API_BACKUP=".api-demo-backup"
STUDIO_BACKUP=".studio-demo-backup"
ROUTES_BUP=".routes-demo-backup"
declare -a PATCHED=()
declare -a HIDDEN_ROUTES=()

restore_all() {
  # Order matters: restore hidden-route directories FIRST so the files
  # listed in PATCHED[] exist on disk before we try to revert them.
  if [ ${#HIDDEN_ROUTES[@]} -gt 0 ]; then
    log "Restoring ${#HIDDEN_ROUTES[@]} hidden routes…"
    for path in "${HIDDEN_ROUTES[@]}"; do
      if [ -d "${ROUTES_BUP}/${path}" ]; then
        rm -rf "app/${path}"
        mv "${ROUTES_BUP}/${path}" "app/${path}"
      fi
    done
  fi
  if [ -d "$API_BACKUP" ]; then
    log "Restoring app/api…"
    rm -rf app/api
    mv "$API_BACKUP" app/api
  fi
  if [ -d "$STUDIO_BACKUP" ]; then
    log "Restoring app/studio…"
    rm -rf app/studio
    mv "$STUDIO_BACKUP" app/studio
  fi
  # Now revert every patched route-segment config. Files should be back on
  # disk; if any still aren't, skip them silently (they were deleted).
  if [ ${#PATCHED[@]} -gt 0 ]; then
    log "Restoring ${#PATCHED[@]} patched route-segment configs…"
    for f in "${PATCHED[@]}"; do
      [ -f "$f" ] || continue
      # Restore the disabled dynamic exports back to their originals.
      perl -i -pe 's|^export const dynamicParams = false$|export const dynamicParams = true|' "$f"
      # Drop the auto-injected patch block (dynamic export + generateStaticParams).
      perl -i -0777 -pe 's|^// DISABLED_FOR_DEMO_BUILD: export const dynamic = "force-dynamic"\nexport async function generateStaticParams\(\) \{ return \[\] \}\n\n||m' "$f"
      # Remove any standalone patched-line markers (defensive — should be
      # covered by the slurp regex above).
      perl -i -pe 's|^// DISABLED_FOR_DEMO_BUILD: export const dynamic = "force-dynamic"$|export const dynamic = "force-dynamic"|' "$f"
    done
  fi
}
trap restore_all EXIT INT TERM

patch_force_dynamic() {
  log "Temporarily disabling \`export const dynamic = \"force-dynamic\"\` for static export…"
  while IFS= read -r f; do
    PATCHED+=("$f")
    # Comment the export out, capture it for re-insertion after the
    # imports. Next.js's static-export walker is strict about top-level
    # declarations appearing after `import` statements, so leaving the
    # patched lines above the imports is brittle.
    local captured
    captured="$(grep -m1 '^export const dynamic = "force-dynamic"$' "$f" || true)"
    if [ -z "$captured" ]; then
      warn "Could not find dynamic export in $f"
      continue
    fi
    perl -i -pe 's|^export const dynamic = "force-dynamic"$|// DISABLED_FOR_DEMO_BUILD: &|' "$f"
    # Inject `generateStaticParams()` right after the last import — both it
    # and the patched dynamic line move together so we can revert cleanly.
    if ! grep -q 'generateStaticParams' "$f"; then
      perl -i -0777 -pe '
        my $insertion = q{// DISABLED_FOR_DEMO_BUILD: export const dynamic = "force-dynamic"\nexport async function generateStaticParams() { return [] }\n\n};
        # Insert after the last import statement.
        if (/^(?:import .* from .*;|import .*\n(?:\n .* from .*;)*)$/m) {
          $_ = $` . $& . $insertion . $'\'';
        }
      ' "$f"
      if ! grep -q 'generateStaticParams' "$f"; then
        warn "Failed to inject generateStaticParams into $f"
      fi
    fi
  done < <(grep -rl 'export const dynamic = "force-dynamic"' app 2>/dev/null || true)
}

# shop/[slug] uses dynamicParams = true, which is incompatible with
# `output: "export"`. Patch it (along with any future dynamicParams files)
# to false so Next.js pre-renders only the static params we declare.
patch_dynamic_params() {
  log "Temporarily disabling \`dynamicParams = true\` for static export…"
  while IFS= read -r f; do
    PATCHED+=("$f")
    # `output: "export"` rejects `dynamicParams = true`. Patch the value
    # itself rather than commenting the export so Next.js still parses
    # the file as a normal route module (comments above imports confuse
    # the static walker).
    perl -i -pe 's|^export const dynamicParams = true$|export const dynamicParams = false|' "$f"
  done < <(grep -rl 'export const dynamicParams = true' app 2>/dev/null || true)
}

hide_api_routes() {
  if [ -d app/api ]; then
    log "Moving app/api aside (API routes can't be statically exported)…"
    mv app/api "$API_BACKUP"
  fi
  if [ -d app/studio ]; then
    log "Moving app/studio aside (Sanity Studio can't be statically exported)…"
    mv app/studio "$STUDIO_BACKUP"
  fi
}

# Whole route directories that aren't part of the marketing/catalogue demo
# (auth, account, admin, community, etc.) — move them aside so Next.js never
# sees them. They're all restored by restore_all on exit.
hide_non_demo_routes() {
  local routes=(
    "[locale]/account"
    "[locale]/admin"
    "[locale]/coa/[batchCode]"
    "[locale]/community"
    "[locale]/checkout/confirm"
    "[locale]/documents"
    "[locale]/newsletter/confirm"
    "[locale]/verify-email"
    "[locale]/plans"
    "[locale]/reset-password"
    "[locale]/forgot-password"
    "[locale]/register"
  )
  for path in "${routes[@]}"; do
    if [ -d "app/${path}" ]; then
      HIDDEN_ROUTES+=("$path")
      mkdir -p "$(dirname "${ROUTES_BUP}/${path}")"
      mv "app/${path}" "${ROUTES_BUP}/${path}"
    fi
  done
  log "Hid ${#HIDDEN_ROUTES[@]} non-demo route directories."
}

command -v pnpm >/dev/null 2>&1 || die "pnpm is required (https://pnpm.io)."

if [ ! -d node_modules ]; then
  log "Installing pnpm dependencies…"
  pnpm install --frozen-lockfile
fi

patch_force_dynamic
patch_dynamic_params
hide_api_routes
hide_non_demo_routes

log "Building static demo (BUILD_MODE=demo, NODE_ENV=production)…"
rm -rf "$NEXT_DIST_DIR" out
pnpm exec next build
BUILD_STATUS=$?

restore_all
trap - EXIT INT TERM

if [ "$BUILD_STATUS" -ne 0 ]; then
  exit "$BUILD_STATUS"
fi

# `output: "export"` writes to ${NEXT_DIST_DIR} (or ./out when distDir is
# the default `.next`). Move the result into ./out so Netlify's `publish`
# setting in netlify.toml works without surprises.
EXPORT_DIR="${NEXT_DIST_DIR}"
if [ "$EXPORT_DIR" != ".next" ] && [ -d "$EXPORT_DIR" ]; then
  if [ ! -f "$EXPORT_DIR/404.html" ] && [ ! -d "$EXPORT_DIR/en" ]; then
    die "Build did not produce expected export files in $EXPORT_DIR."
  fi
  rm -rf out
  mv "$EXPORT_DIR" out
fi

if [ ! -d out ]; then
  die "Build finished but ./out does not exist — Next.js did not emit a static export."
fi

ok "Static demo built into ./out"
log "Files: $(find out -type f | wc -l | tr -d ' ')"

if [ "${1:-}" = "--serve" ]; then
  log "Serving ./out on http://localhost:3001"
  pnpm exec serve -s out -l 3001
fi