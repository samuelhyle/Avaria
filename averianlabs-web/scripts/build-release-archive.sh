#!/usr/bin/env bash
# Builds the source archive for a Netlify hosted build.
#
# Netlify's hosted build API accepts a ZIP of the repository source. The
# archive has to be produced from a committed tree, not from the working
# directory: a build that runs against uncommitted files is not reproducible,
# and the runbook records the exact source tree of every release.
#
# The archive is built with `git archive`, which means it contains exactly
# what is committed — no local edits, no untracked files, no `.env` files,
# and no build output.
#
# Usage:
#   scripts/build-release-archive.sh <output.zip> [tree-ish]
#
# The tree-ish defaults to HEAD. The archive's SHA-256 is printed so the
# release record can name it.
set -euo pipefail

# The repository root is two levels up from this script: the application
# lives in `averianlabs-web/`, and the Git repository is above it.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

OUTPUT="${1:?usage: build-release-archive.sh <output.zip> [tree-ish]}"
TREE="${2:-HEAD}"

if ! git rev-parse --verify "$TREE" >/dev/null 2>&1; then
  echo "build-release-archive: unknown tree-ish '$TREE'" >&2
  exit 2
fi

# The paths to leave out are declared in the repository's `.gitattributes` as
# `export-ignore`, so the same rule applies to every archive produced from
# this repository rather than only to this script.
git archive --format=zip --output="$OUTPUT" "$TREE"

SHA=$(shasum -a 256 "$OUTPUT" | awk '{print $1}')
TREE_SHA=$(git rev-parse "$TREE^{tree}")
SIZE=$(wc -c <"$OUTPUT" | tr -d ' ')

echo "archive:    $OUTPUT"
echo "tree:       $TREE_SHA"
echo "sha256:     $SHA"
echo "bytes:      $SIZE"
