#!/usr/bin/env bash
# Writes the published skill package release index (index.json on the rolling `skills-index`
# release) to OUT, or an empty index when none has been published yet. Any other failure stops the
# run, so a release never starts from an index it could not read.
#
#   .github/scripts/fetch-release-index.sh OWNER/REPO OUT
set -euo pipefail
repo="$1"
out="$2"
errors="$(mktemp)"
if gh release view skills-index --repo "$repo" --json tagName >/dev/null 2>"$errors"; then
  gh release download skills-index --repo "$repo" --pattern index.json --output "$out" --clobber
  echo "fetched the published release index"
elif grep -qi "release not found" "$errors"; then
  node --input-type=module -e \
    'import { emptyIndex, serializeIndex } from "./scripts/lib/release.js"; process.stdout.write(serializeIndex(emptyIndex()));' \
    >"$out"
  echo "no release index published yet: starting from an empty index"
else
  cat "$errors" >&2
  exit 1
fi
