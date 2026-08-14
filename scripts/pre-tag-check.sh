#!/usr/bin/env bash
#
# pre-tag-check.sh <version> [repo-dir]
#
# Validates that a repository is ready to be tagged <version>, so a release is
# never cut with a stale version field, an un-cut changelog, or - in the spec
# repo - an engine pin drift file nobody reconciled. Run it from a repo root (or
# pass the repo dir) BEFORE publishing the draft release / tagging.
#
#   bash scripts/pre-tag-check.sh 0.1.2                 # check the current repo
#   bash /path/to/carve/scripts/pre-tag-check.sh 0.1.1 ../carve-rs
#
# Exit status is non-zero if anything fails. This mirrors the CI release guards
# in carve-js/carve-rs (which block npm/cargo publish on a version or changelog
# mismatch) and extends the same check to repos whose publish CI cannot gate it
# (carve-php ships via a Packagist webhook on tag push; tree-sitter-carve has no
# release workflow).
set -u

VERSION="${1:-}"
DIR="${2:-.}"

if [ -z "$VERSION" ]; then
  echo "usage: pre-tag-check.sh <version> [repo-dir]" >&2
  exit 2
fi

cd "$DIR" || { echo "cannot cd into $DIR" >&2; exit 2; }

fail=0
ok()   { echo "  [ok]   $*"; }
bad()  { echo "  [FAIL] $*"; fail=1; }
skip() { echo "  [skip] $*"; }

echo "Pre-tag check for $VERSION in $(pwd)"

# A dot-escaped copy of the version for anchored greps.
ESCV="${VERSION//./\\.}"

# 1. Clean working tree.
if [ -n "$(git status --porcelain)" ]; then
  bad "working tree is not clean - commit or stash before tagging"
else
  ok "working tree clean"
fi

# 2. On the primary branch, up to date with origin.
git fetch -q origin 2>/dev/null || true
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  bad "on branch '$BRANCH', not main/master"
elif git rev-parse -q --verify "origin/$BRANCH" >/dev/null 2>&1 \
     && [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
  bad "HEAD is not level with origin/$BRANCH (pull/push first)"
else
  ok "on $BRANCH, level with origin"
fi

# 3. Tag not already present (local or remote).
if git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null 2>&1; then
  bad "tag $VERSION already exists locally"
elif git ls-remote --exit-code --tags origin "refs/tags/$VERSION" >/dev/null 2>&1; then
  bad "tag $VERSION already exists on origin"
else
  ok "tag $VERSION not yet present"
fi

# 4. Version field matches the target (auto-detect the manifest).
if [ -f package.json ]; then
  V="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"
  [ "$V" = "$VERSION" ] && ok "package.json version = $VERSION" \
    || bad "package.json version is '$V', expected $VERSION"
elif [ -f Cargo.toml ]; then
  V="$(grep -m1 -E '^version[[:space:]]*=' Cargo.toml | sed -E 's/.*"([^"]+)".*/\1/')"
  [ "$V" = "$VERSION" ] && ok "Cargo.toml version = $VERSION" \
    || bad "Cargo.toml version is '$V', expected $VERSION"
else
  skip "no package.json/Cargo.toml version field (tag-derived, e.g. Packagist)"
fi

# 5. Changelog has a cut section for the version (not just [Unreleased]).
if [ -f CHANGELOG.md ]; then
  if grep -qE "^## \[?${ESCV}\]?" CHANGELOG.md; then
    ok "CHANGELOG.md has a '## [$VERSION]' section"
  else
    bad "CHANGELOG.md has no '## [$VERSION]' section - cut it from [Unreleased]"
  fi
else
  skip "no CHANGELOG.md"
fi

# 6. Spec submodule initialized (if the repo vendors one).
if [ -f .gitmodules ] && grep -q 'carve' .gitmodules 2>/dev/null; then
  SPEC="$(git config -f .gitmodules --get-regexp 'submodule\..*\.path' 2>/dev/null | awk '{print $2}' | head -1)"
  if [ -n "$SPEC" ]; then
    if git submodule status "$SPEC" 2>/dev/null | grep -q '^-'; then
      bad "spec submodule '$SPEC' is not initialized (git submodule update --init)"
    else
      ok "spec submodule '$SPEC' initialized"
    fi
  fi
fi

# 7. Engine pin drift is CURRENT, not merely declared (carve#1200).
#
# CI gates that every mismatch between the corpus and the pinned reference build
# is DECLARED in resources/engine-pin-drift.txt. Nothing gated that the
# declarations are still true. A release is exactly where the difference shows:
# an entry whose rule the pinned build now reproduces reads as "the corpus is
# ahead of the engines" while meaning "nobody has run bump-carve-pin in a
# while", and a reader of the release cannot tell those apart.
#
# `engine:report --check` already fails in both directions, so this is a gate on
# a report rather than a second implementation of it.
#
# Only this repo has the file. Invoked from carve-js/carve-rs/carve-php the
# block does not run, which is why it tests the file rather than the version
# field.
if [ -f resources/engine-pin-drift.txt ]; then
  if [ ! -d node_modules ]; then
    # NOT a skip. The drift file is present, so the claim is checkable and
    # unchecked; passing here would report a verification that did not happen.
    bad "engine pin drift not verified - node_modules missing, run npm ci first"
  else
    if DRIFT_OUT="$(npm run --silent engine:report -- --check 2>&1)"; then
      ok "engine pin drift matches what is declared"
    else
      bad "engine pin drift is stale or undeclared - run npm run bump-carve-pin, then delete every line that now reproduces"
      printf '%s\n' "$DRIFT_OUT" | grep -E 'UNDECLARED|reproduces|no longer|declared drift' | sed 's/^/         /'
    fi
  fi
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "PRE-TAG CHECK FAILED - do not tag $VERSION yet."
  exit 1
fi
echo "PRE-TAG CHECK PASSED - ready to tag $VERSION."
