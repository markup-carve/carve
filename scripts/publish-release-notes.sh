#!/usr/bin/env bash
set -euo pipefail

version="$1"
approved_sha="$2"
id="$(gh api "repos/$GITHUB_REPOSITORY/releases" --paginate \
  | jq -rs --arg tag "$version" '[.[][] | select(.tag_name == $tag and .draft)] | first | .id // empty')"
if [ -z "$id" ]; then
  echo "::error::No draft release for $version."
  exit 1
fi

gh api "repos/$GITHUB_REPOSITORY/releases/$id" -X PATCH \
  -f tag_name="$version" -F draft=false >/dev/null
release="$(gh api "repos/$GITHUB_REPOSITORY/releases/$id")"
printf '%s' "$release" | jq -e --arg tag "$version" \
  '(.tag_name == $tag) and (.draft == false)' >/dev/null || {
  echo "::error::Published release has the wrong tag or draft state."
  exit 1
}
target="$(printf '%s' "$release" | jq -r '.target_commitish // empty')"
if [ "$target" != "$approved_sha" ]; then
  resolved="$(git ls-remote origin "refs/heads/$target" | cut -f1)"
  if [ "$resolved" != "$approved_sha" ]; then
    echo "::error::Published release targets $target, not $approved_sha."
    exit 1
  fi
fi
echo "published $version at $approved_sha"
