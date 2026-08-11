#!/usr/bin/env bash
# Close an automation/bump-spec draft whose pin is already behind the pin on
# the downstream repository's main branch.  REPO and SUB identify one row of
# bump-downstream.yml's matrix.
set -euo pipefail

: "${REPO:?set REPO to owner/name}"
: "${SUB:?set SUB to the spec submodule path}"

pr="$(gh pr list --repo "$REPO" --head automation/bump-spec --state open \
  --json number,isDraft,headRefOid \
  --jq 'map(select(.isDraft)) | .[0] | [.number, .headRefOid] | @tsv' 2>/dev/null || true)"
if [ -z "$pr" ]; then
  echo "$REPO: no open draft bump PR."
  exit 0
fi

IFS=$'\t' read -r number head_sha <<< "$pr"
pr_pin="$(gh api "repos/$REPO/contents/$SUB?ref=$head_sha" --jq '.sha' 2>/dev/null || true)"
main_pin="$(gh api "repos/$REPO/contents/$SUB?ref=main" --jq '.sha' 2>/dev/null || true)"
if [ -z "$pr_pin" ] || [ -z "$main_pin" ]; then
  echo "::warning::$REPO#$number: could not resolve both $SUB pins; leaving the draft open"
  exit 0
fi
if [ "$pr_pin" = "$main_pin" ]; then
  echo "$REPO#$number: draft and main both pin ${main_pin:0:7}; not superseded."
  exit 0
fi

# The checkout is carve itself with full history. A downstream gitlink can
# name a just-landed commit that this checkout predates, so fetch main once if
# either object is absent before asking the ancestry question.
if ! git cat-file -e "$pr_pin^{commit}" 2>/dev/null \
   || ! git cat-file -e "$main_pin^{commit}" 2>/dev/null; then
  git fetch --quiet origin main
fi
if ! git merge-base --is-ancestor "$pr_pin" "$main_pin"; then
  echo "$REPO#$number: ${pr_pin:0:7} is not an ancestor of main's ${main_pin:0:7}; leaving the draft open."
  exit 0
fi

# A draft can contain the implementation a human added after automation
# opened it. Superseding the gitlink does not supersede that work, so close
# only the mechanical, submodule-only shape.
other="$(gh api --paginate "repos/$REPO/pulls/$number/files" --jq '.[].filename' 2>/dev/null \
  | grep -v -F -x -- "$SUB" || true)"
if [ -n "$other" ]; then
  files="$(tr '\n' ' ' <<< "$other")"
  echo "::warning::$REPO#$number pins superseded carve ${pr_pin:0:7}, but also changes $files- leaving it open"
  exit 0
fi

comment="Closing as superseded: this draft targets carve \`${pr_pin:0:7}\`, while \`$REPO\` main already pins descendant \`${main_pin:0:7}\`. Merging this PR would move the spec pin backwards. A later bump run can target the current carve head."
gh pr close "$number" --repo "$REPO" --delete-branch --comment "$comment"
echo "$REPO#$number: closed superseded draft (${pr_pin:0:7} -> main ${main_pin:0:7})."
