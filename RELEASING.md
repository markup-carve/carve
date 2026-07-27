# Releasing

Carve ships as a spec repo plus three reference engines. They release
independently (each has its own version and CHANGELOG), but a coordinated
release goes in dependency order so the engines pin a released spec.

## Order

1. `carve` (spec + corpus + oracle)
2. `carve-js`
3. `carve-rs`
4. `carve-php`

`tree-sitter-carve` and the other satellites release on their own cadence.

## Per-repo checklist

For each repo, on `main`, with the spec submodule (if any) already advanced and
CI green:

1. **Bump the version field** to the target:
   - `carve`, `carve-js`, `tree-sitter-carve`: `package.json` `"version"`
   - `carve-rs`: `Cargo.toml` `version`
   - `carve-php`: none - the version is derived from the git tag (Packagist)
2. **Reconcile the CHANGELOG.** Make sure `## [Unreleased]` covers everything in
   the `lastTag..main` range (the draft release notes are the source of truth for
   scope), then cut it to `## [X.Y.Z] - YYYY-MM-DD` and open a fresh empty
   `## [Unreleased]` above it.
3. **Run the pre-tag check** (fails on a stale version field, an un-cut
   changelog, a dirty tree, a missing tag, or an uninitialized spec submodule):

   ```sh
   bash scripts/pre-tag-check.sh X.Y.Z
   # or, from another repo, point at this script:
   bash ../carve/scripts/pre-tag-check.sh X.Y.Z
   ```

4. Land steps 1-2 via a PR to `main` and merge it.
5. **Publish the prepared draft GitHub Release.** Publishing creates the tag at
   the current `main`; the tag then drives the registry publish.

## Guards

The publish step is gated so a mistake cannot ship the wrong version:

- **carve-js** (`.github/workflows/release.yml`, on tag push): fails before
  `npm publish` unless `package.json` version equals the tag AND `CHANGELOG.md`
  has a matching `## [<tag>]` section.
- **carve-rs** (`.github/workflows/release.yml`, on release published): the same
  version-and-changelog guard before `cargo publish`.
- **carve-php**: Packagist publishes via a webhook on tag push, which CI cannot
  block. The pre-tag check is the only gate here - run it before tagging.
- **tree-sitter-carve**: no automated publish workflow; publish manually and run
  the pre-tag check first.

## Never

- Never tag before `pre-tag-check.sh` passes.
- Never publish a version whose field or changelog does not match the tag.
- Never bump a version field except as part of a release (version numbers are
  release artifacts, not commit counters).
