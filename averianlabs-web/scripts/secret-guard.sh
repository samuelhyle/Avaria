#!/usr/bin/env bash
# Pre-commit guard: never let a real secret reach the repository.
#
# The application reads its provider credentials from the host's environment.
# A committed value would end up in the Git history, in every clone, and in
# every published build -- and the value would be rotated out of the host's
# settings but still live on forever in the repository.
#
# Only the tracked `*.env` templates are exempt: they hold placeholders and
# documentation, never credentials. `*.env.local` and the other local files
# are gitignored and never reach a commit in the first place.
#
# The pattern below matches the shapes of the credentials this project
# actually uses:
#
#   Stripe        sk_live_...  sk_test_...  rk_live_...  whsec_...
#   Resend        re_...
#   Google        AIza...
#   GitHub        ghp_...  gho_...  ghu_...  ghs_...  github_pat_...
#   AWS           AKIA...  AROA...
#   Slack         xox[baprs]-...
#   Private key   -----BEGIN ... PRIVATE KEY-----
#   Postgres URL with an inline password
#
# Exits non-zero when a staged file contains one, and prints the file and the
# pattern that matched so the author can remove it.
set -uo pipefail

# Load the pattern list once, up front, so the grep below is a single pass.
# Each line is one alternative; the file is read with `grep -f` so no
# quoting of the patterns themselves is needed.
PATTERN_FILE=$(mktemp)
trap 'rm -f "$PATTERN_FILE"' EXIT
cat >"$PATTERN_FILE" <<'PATTERNS'
sk_live_[0-9a-zA-Z]{16,}
sk_test_[0-9a-zA-Z]{16,}
rk_live_[0-9a-zA-Z]{16,}
whsec_[0-9a-zA-Z]{16,}
re_[0-9a-zA-Z]{16,}
AIza[0-9A-Za-z_-]{30,}
ghp_[0-9a-zA-Z]{30,}
gho_[0-9a-zA-Z]{30,}
ghu_[0-9a-zA-Z]{30,}
ghs_[0-9a-zA-Z]{30,}
github_pat_[0-9a-zA-Z_]{30,}
AKIA[0-9A-Z]{16}
AROA[0-9A-Z]{16}
xox[baprs]-[0-9a-zA-Z-]{10,}
-----BEGIN [A-Z ]*PRIVATE KEY-----
postgres(ql)?://[^[:space:]]*:[^[:space:]@]+@
PATTERNS

# Collect the files about to be committed. The paths come from the repository
# root, so they are resolved against it rather than against the current
# directory — the hook may run from anywhere inside the repository.
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT" || exit 0

# `*.env.example` and the documentation hold placeholders, not credentials.
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -Ev '(^|/)\.env\.example$|\.example$|\.lock$|\.md$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# shellcheck disable=SC2086
MATCHES=$(printf '%s\n' $STAGED_FILES | xargs grep -nEI -f "$PATTERN_FILE" 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "secret-guard: a credential-looking value is staged." >&2
  echo "$MATCHES" >&2
  echo >&2
  echo "Remove the value and set it in the host's environment instead." >&2
  echo "A credential that reaches a commit has to be rotated, not just deleted." >&2
  exit 1
fi

exit 0
