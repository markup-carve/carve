#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
latest_base="${DOCS_LATEST_BASE:-/carve/}"
latest_label="${DOCS_LATEST_LABEL:-0.1 (latest)}"
secondary_ref="${DOCS_SECONDARY_REF:-origin/next2}"
secondary_base="${DOCS_SECONDARY_BASE:-/carve/0.2/}"
secondary_label="${DOCS_SECONDARY_LABEL:-0.2 (dev)}"
secondary_edit_branch="${DOCS_SECONDARY_EDIT_BRANCH:-next2}"
secondary_series="${DOCS_SECONDARY_SERIES:-dev}"
combined_dist="$repo_dir/docs/.vitepress/dist-versioned"
secondary_tree="$(mktemp -d "${TMPDIR:-/tmp}/carve-docs-secondary.XXXXXX")"
worktree_added=0

cleanup() {
  if [[ "$worktree_added" == 1 ]]; then
    git -C "$repo_dir" worktree remove --force "$secondary_tree"
  fi
}
trap cleanup EXIT

start="$(date +%s)"
echo "Building $latest_label at $latest_base"
(
  cd "$repo_dir"
  npm ci
  DOCS_BASE="$latest_base" \
    DOCS_VERSION_TEXT="$latest_label" \
    DOCS_LATEST_BASE="$latest_base" \
    DOCS_LATEST_LABEL="$latest_label" \
    DOCS_OTHER_BASE="$secondary_base" \
    DOCS_OTHER_LABEL="$secondary_label" \
    DOCS_EDIT_BRANCH=main \
    npm run docs:build
)
echo "Latest build: $(( $(date +%s) - start )) seconds"

# Build the second ref with its own package files, theme, config and engine pin.
git -C "$repo_dir" worktree add --detach "$secondary_tree" "$secondary_ref"
worktree_added=1
start="$(date +%s)"
echo "Building $secondary_label from $secondary_ref at $secondary_base"
(
  cd "$secondary_tree"
  npm ci
  DOCS_BASE="$secondary_base" \
    DOCS_VERSION_TEXT="$secondary_label" \
    DOCS_LATEST_BASE="$latest_base" \
    DOCS_LATEST_LABEL="$latest_label" \
    DOCS_OTHER_BASE="$secondary_base" \
    DOCS_OTHER_LABEL="$secondary_label" \
    DOCS_EDIT_BRANCH="$secondary_edit_branch" \
    VITE_DOCS_SERIES="$secondary_series" \
    npm run docs:build
)
echo "Secondary build: $(( $(date +%s) - start )) seconds"

# Only built output crosses refs. A failed install or build leaves no new
# combined site for the deployment job to upload.
node -e 'import("node:fs").then(fs => fs.rmSync(process.argv[1], { recursive: true, force: true }))' "$combined_dist"
mkdir -p "$combined_dist"
cp -R "$repo_dir/docs/.vitepress/dist/." "$combined_dist/"
secondary_subpath="${secondary_base#"$latest_base"}"
secondary_subpath="${secondary_subpath%/}"
if [[ -z "$secondary_subpath" || "$secondary_subpath" == "$secondary_base" || "$secondary_subpath" == *..* ]]; then
  echo "Secondary base must be a child of latest base" >&2
  exit 1
fi
mkdir -p "$combined_dist/$secondary_subpath"
cp -R "$secondary_tree/docs/.vitepress/dist/." "$combined_dist/$secondary_subpath/"
echo "Combined docs: $combined_dist"
