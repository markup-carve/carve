#!/usr/bin/env bash
set -euo pipefail

# An empty ref builds this checkout itself; any other ref is built in its own worktree.
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
latest_ref="${DOCS_LATEST_REF-origin/0.1}"
latest_base="${DOCS_LATEST_BASE:-/carve/}"
latest_label="${DOCS_LATEST_LABEL:-0.1 (latest)}"
latest_edit_branch="${DOCS_LATEST_EDIT_BRANCH:-0.1}"
latest_series="${DOCS_LATEST_SERIES:-}"
secondary_ref="${DOCS_SECONDARY_REF-}"
secondary_base="${DOCS_SECONDARY_BASE:-/carve/0.2/}"
secondary_label="${DOCS_SECONDARY_LABEL:-0.2 (dev)}"
secondary_edit_branch="${DOCS_SECONDARY_EDIT_BRANCH:-main}"
secondary_series="${DOCS_SECONDARY_SERIES-dev}"
# Space-separated version paths that redirect to latest, e.g. the latest series' own /carve/0.2/.
redirect_bases="${DOCS_REDIRECT_BASES-}"
combined_dist="$repo_dir/docs/.vitepress/dist-versioned"
worktrees=()

cleanup() {
  for tree in "${worktrees[@]}"; do
    git -C "$repo_dir" worktree remove --force "$tree"
  done
}
trap cleanup EXIT

# Prints the directory a side builds in: this checkout, or a new worktree of its ref.
side_tree() {
  local ref="$1"
  if [[ -z "$ref" ]]; then
    echo "$repo_dir"
    return
  fi
  local tree
  tree="$(mktemp -d "${TMPDIR:-/tmp}/carve-docs-side.XXXXXX")"
  git -C "$repo_dir" worktree add --detach "$tree" "$ref" >&2
  echo "$tree"
}

# Each side builds with its own package files, theme, config and engine pin.
build_side() {
  local tree="$1" base="$2" label="$3" edit_branch="$4" series="$5"
  local start
  start="$(date +%s)"
  echo "Building $label from $tree at $base"
  (
    cd "$tree"
    npm ci
    DOCS_BASE="$base" \
      DOCS_VERSION_TEXT="$label" \
      DOCS_LATEST_BASE="$latest_base" \
      DOCS_LATEST_LABEL="$latest_label" \
      DOCS_OTHER_BASE="$secondary_base" \
      DOCS_OTHER_LABEL="$secondary_label" \
      DOCS_EDIT_BRANCH="$edit_branch" \
      VITE_DOCS_SERIES="$series" \
      npm run docs:build
  )
  echo "$label build: $(( $(date +%s) - start )) seconds"
}

secondary_subpath="${secondary_base#"$latest_base"}"
secondary_subpath="${secondary_subpath%/}"
if [[ -z "$secondary_subpath" || "$secondary_subpath" == "$secondary_base" || "$secondary_subpath" == *..* ]]; then
  echo "Secondary base must be a child of latest base" >&2
  exit 1
fi

latest_tree="$(side_tree "$latest_ref")"
[[ "$latest_tree" == "$repo_dir" ]] || worktrees+=("$latest_tree")
build_side "$latest_tree" "$latest_base" "$latest_label" "$latest_edit_branch" "$latest_series"

secondary_tree="$(side_tree "$secondary_ref")"
[[ "$secondary_tree" == "$repo_dir" ]] || worktrees+=("$secondary_tree")
build_side "$secondary_tree" "$secondary_base" "$secondary_label" "$secondary_edit_branch" "$secondary_series"

# Only built output crosses refs. A failed install or build leaves no new
# combined site for the deployment job to upload.
node -e 'import("node:fs").then(fs => fs.rmSync(process.argv[1], { recursive: true, force: true }))' "$combined_dist"
mkdir -p "$combined_dist/$secondary_subpath"
cp -R "$latest_tree/docs/.vitepress/dist/." "$combined_dist/"
cp -R "$secondary_tree/docs/.vitepress/dist/." "$combined_dist/$secondary_subpath/"
if [[ -n "$redirect_bases" ]]; then
  # shellcheck disable=SC2086 # one argument per base
  node "$repo_dir/scripts/write-docs-redirects.mjs" "$latest_tree/docs/.vitepress/dist" "$combined_dist" "$latest_base" $redirect_bases
fi
echo "Combined docs: $combined_dist"
