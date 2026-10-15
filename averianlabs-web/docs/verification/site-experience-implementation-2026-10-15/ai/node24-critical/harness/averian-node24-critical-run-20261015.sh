#!/bin/sh
set -eu
if [ "$#" -ne 3 ]; then
  echo 'Usage: confirmed-ready-origin exact-source-commit absolute-node24-binary' >&2
  exit 2
fi
if [ "${AI_EVAL_READY_NODE24:-}" != '1' ]; then
  echo 'Root must confirm actual ready Node24 runtime before this run.' >&2
  exit 2
fi
task_origin=$1
task_source=$2
task_node=$3
task_repo=/Users/purepanel/Avaria/averianlabs-web
task_evidence="$task_repo/docs/verification/site-experience-implementation-2026-10-15/ai/node24-critical"
case "$("$task_node" --version)" in v24.*) ;; *) echo 'Use actual local Node24 for the evaluation runner.' >&2; exit 2 ;; esac
cd "$task_repo"
export BASE_URL="$task_origin" EVALUATED_SOURCE="$task_source" AI_EVAL_TARGET=review
export AI_EVAL_PACING_STATE=/tmp/averian-node24-eval-pacing-state-20261015.json
export AI_EVAL_ONLY=concentration,micrograms,microlitres,volume,dilution,aliquots,remainder,decimal,missing-molar-mass
export AI_EVAL_OUTPUT="$task_evidence/api-cases.json"
unset AI_EVAL_COOKIE AI_EVAL_RESUME
"$task_node" --import /tmp/averian-node24-eval-api-guard-20261015.mjs --import tsx scripts/ai-research-eval.ts
export AI_FINAL_SUITE_PATH="$AI_EVAL_OUTPUT"
export AI_EVAL_OUTPUT="$task_evidence/final-ui/api-cases.json"
"$task_node" --import tsx /tmp/averian-node24-ui-confirmation-20261015.mts
echo 'Evaluation complete. No more model calls until the saved cooldownUntil; all browsers closed.'
