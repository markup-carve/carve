#!/usr/bin/env bash
#
# pre-tag-check.sh <version> [repo-dir] [--tag <tag>]
#
# Validates that a repository is ready to release <version>, so a release is
# never cut with a stale version field, an un-cut changelog, or - in the spec
# repo - an engine pin drift file nobody reconciled. Run it from a repo root (or
# pass the repo dir) BEFORE publishing the draft release / tagging.
#
#   bash scripts/pre-tag-check.sh 0.1.2                 # check the current repo
#   bash /path/to/carve/scripts/pre-tag-check.sh 0.1.1 ../carve-rs
#   bash scripts/pre-tag-check.sh 0.1.4 ../carve-lsp --tag v0.1.4
#
# Exit status is non-zero if anything fails. This mirrors the CI release guards
# in carve-js/carve-rs (which block npm/cargo publish on a version or changelog
# mismatch) and extends the same check to repos whose publish CI cannot gate it
# (carve-php ships via a Packagist webhook on tag push; tree-sitter-carve has no
# release workflow).
set -u

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: pre-tag-check.sh <version> [repo-dir] [--tag <tag>]" >&2
  exit 2
fi
shift

DIR="."
DIR_SET=0
TAG="$VERSION"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --tag)
      [ "$#" -ge 2 ] && [ -n "$2" ] \
        || { echo "--tag requires a tag name" >&2; exit 2; }
      TAG="$2"
      shift 2
      ;;
    -*)
      echo "unknown option: $1" >&2
      exit 2
      ;;
    *)
      [ "$DIR_SET" -eq 0 ] \
        || { echo "unexpected argument: $1" >&2; exit 2; }
      DIR="$1"
      DIR_SET=1
      shift
      ;;
  esac
done

cd "$DIR" || { echo "cannot cd into $DIR" >&2; exit 2; }

fail=0
ok()   { echo "  [ok]   $*"; }
bad()  { echo "  [FAIL] $*"; fail=1; }
skip() { echo "  [skip] $*"; }

if ! git check-ref-format "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "invalid tag name: $TAG" >&2
  exit 2
fi

echo "Pre-tag check for version $VERSION (tag $TAG) in $(pwd)"

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
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null 2>&1; then
  bad "tag $TAG already exists locally"
elif git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  bad "tag $TAG already exists on origin"
else
  ok "tag $TAG not yet present"
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
  # A repo may carry BOTH, and the chain above stops at the first match. carve-py
  # is that repo: `Cargo.toml` is what `carve.__version__` reports and
  # `pyproject.toml` is what the tag guard in its release workflow reads, so
  # checking only one leaves the other free to disagree with the tag. Additive,
  # so a Rust-only repo is unaffected.
  if [ -f pyproject.toml ]; then
    PV="$(sed -n 's/^version[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' pyproject.toml | head -1)"
    [ "$PV" = "$VERSION" ] && ok "pyproject.toml version = $VERSION" \
      || bad "pyproject.toml version is '$PV', expected $VERSION"
  fi
else
  skip "no package.json/Cargo.toml version field (tag-derived, e.g. Packagist)"
fi

# 4a. A native extension's manifest, which the chain above cannot reach.
#
# carve-rb has no ROOT manifest of either kind - its crate lives at
# ext/carve/Cargo.toml - so the chain takes its `else` and skips, and the gem
# would ship a stale extension version with nothing objecting. Checked outside
# the chain rather than inside it, so a repo carrying both a root manifest and a
# nested one gets both.
if [ -f ext/carve/Cargo.toml ]; then
  EV="$(grep -m1 -E '^version[[:space:]]*=' ext/carve/Cargo.toml | sed -E 's/.*"([^"]+)".*/\1/')"
  [ "$EV" = "$VERSION" ] && ok "ext/carve/Cargo.toml version = $VERSION" \
    || bad "ext/carve/Cargo.toml version is '$EV', expected $VERSION"
fi

# 4b. Constants that state the version a SECOND time.
#
# Step 4 reads the manifest, and three repos also compile the version into a
# constant an embedder can read back. Nothing here gated those, and carve-js
# published three releases whose `LIB_VERSION` still said 0.1.0 before an
# outside embedder noticed (markup-carve/carve-js#1074). carve-php is the sharper
# case: it has no manifest field at all, so step 4 SKIPS it entirely and this is
# the only version check the repo gets before a Packagist webhook publishes the
# tag.
#
# Detected by file and extracted per file, deliberately not through one shared
# pattern. A `\(LIB_VERSION\|VERSION\)` alternation looks tidier and is wrong:
# `src/version.ts` declares `SPEC_VERSION` above `LIB_VERSION`, the alternation
# matches the `VERSION` inside `SPEC_VERSION` on the earlier line, and the check
# then compares the SPEC version ('0.1') against the release target and fails
# for a reason that has nothing to do with the release.
CONST_FILE=""
CONST_VALUE=""
if [ -f src/version.ts ]; then
  CONST_FILE="src/version.ts"
  CONST_VALUE="$(sed -n "s/.*LIB_VERSION[^'\"]*['\"]\([^'\"]*\)['\"].*/\1/p" src/version.ts | head -1)"
elif [ -f src/CarveConverter.php ]; then
  CONST_FILE="src/CarveConverter.php"
  CONST_VALUE="$(sed -n "s/.*LIB_VERSION[^'\"]*['\"]\([^'\"]*\)['\"].*/\1/p" src/CarveConverter.php | head -1)"
elif [ -f lib/carve/version.rb ]; then
  CONST_FILE="lib/carve/version.rb"
  CONST_VALUE="$(sed -n 's/.*VERSION[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' lib/carve/version.rb | head -1)"
fi

if [ -z "$CONST_FILE" ]; then
  skip "no version constant file (carve-rs reports CARGO_PKG_VERSION; carve, tree-sitter-carve state it once)"
elif [ "$CONST_VALUE" = "$VERSION" ]; then
  ok "$CONST_FILE states $VERSION"
else
  # Name BOTH values. "does not match" sends the reader to open two files and
  # diff them by eye, which is the same manual step this check exists to remove.
  bad "$CONST_FILE states '$CONST_VALUE', expected $VERSION"
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
  # The report renders through the INSTALLED build, and the pin is a field in
  # package.json. `bump-carve-pin` writes that field and installs nothing - it
  # prints "Now run: npm install" - so running the report straight after a bump
  # measures the build from BEFORE it and can call the ledger current for a
  # commit that is no longer pinned. tests/engine-pin-matches-the-lock.test.mjs
  # already ties package.json to package-lock.json; this ties both to the tree
  # npm actually laid down, which is the copy the report reads.
  elif ! PIN_MISMATCH="$(node -e '
      const fs = require("fs")
      const sha = (s) => (String(s).match(/[0-9a-f]{40}/) || [])[0]
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
      const dep = (pkg.devDependencies || {})["@markup-carve/carve"]
        || (pkg.dependencies || {})["@markup-carve/carve"]
      const declared = sha(dep)
      const treeLock = "node_modules/.package-lock.json"
      // EVERY unknown is a failure. A comparison that cannot be made has not
      // been made, and exiting 0 here would hand the report an installation
      // nothing vouched for - which is the case this whole block exists for.
      if (!declared) {
        console.error("package.json does not pin @markup-carve/carve to a commit")
        process.exit(1)
      }
      if (!fs.existsSync(treeLock)) {
        console.error("node_modules/.package-lock.json is missing, so the installed build is unverifiable")
        process.exit(1)
      }
      const tree = JSON.parse(fs.readFileSync(treeLock, "utf8"))
      const installed = sha((tree.packages || {})["node_modules/@markup-carve/carve"]?.resolved)
      if (!installed) {
        console.error("the installed tree records no commit for @markup-carve/carve")
        process.exit(1)
      }
      if (installed !== declared) {
        console.error(`installed ${installed.slice(0, 12)}, package.json pins ${declared.slice(0, 12)}`)
        process.exit(1)
      }
    ' 2>&1)"; then
    bad "installed reference build is not the pinned one ($PIN_MISMATCH) - run npm install, then re-check"
  else
    if DRIFT_OUT="$(npm run --silent engine:report -- --check 2>&1)"; then
      ok "engine pin drift matches what is declared"
    else
      bad "engine pin drift is stale or undeclared - run npm run bump-carve-pin, then delete every line that now reproduces"
      printf '%s\n' "$DRIFT_OUT" | grep -E 'UNDECLARED|reproduces|no longer|declared drift' | sed 's/^/         /'
    fi
  fi
fi

# 8. EVERY declaration list is clear, not only resources/engine-pin-drift.txt.
#
# Step 7 gates ONE ledger. It is not the only place a release can carry a
# silenced comparison: this repo has a dozen more (resources/*.txt plus the
# declaration constants in tests/), and each engine carries its OWN constants
# against the spec submodule it vendors - AHEAD_OF_PIN, KNOWN_GAPS,
# BEHIND_THE_RULING, KNOWN_LOSSES. Nothing compared the two populations, which
# is exactly where a stale entry survives a corpus bump: the ledger here gets
# cleaned and the vendored constant does not.
#
# Measured 2026-08-24, before this step existed: four rows in carve-js's
# KNOWN_LOSSES no longer reproduced, and one row in carve-php's KNOWN_REMAINING
# named a corpus document upstream had renumbered. Both lists lack a staleness
# half, so neither could ever have said so.
#
# Engine halves are read from each sibling checkout's origin/main, since a local
# engine checkout is usually parked on a feature branch.
# It reads text and shells out to git only, so unlike step 7 it needs no
# installed build and no node_modules.
if [ -f scripts/declaration-audit.mjs ]; then
  if AUDIT_OUT="$(node scripts/declaration-audit.mjs 2>&1)"; then
    ok "every owed declaration list is empty"
  else
    bad "declaration lists are not clear - see below"
    printf '%s\n' "$AUDIT_OUT" | sed 's/^/         /'
  fi
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "PRE-TAG CHECK FAILED - do not tag $TAG yet."
  exit 1
fi
echo "PRE-TAG CHECK PASSED - ready to tag $TAG."
