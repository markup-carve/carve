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
3. **`carve` only - reconcile the engine pin drift.** `resources/engine-pin-drift.txt`
   lists the corpus documents the pinned reference build does not reproduce, and
   a release is the moment that list has to be true rather than merely present:

   ```sh
   npm run bump-carve-pin          # against current carve-js main
   npm install                     # the bump edits package.json and installs nothing
   npm run engine:report -- --check
   ```

   `npm install` is not optional. The report renders through the INSTALLED
   build, so skipping it produces a ledger for the pin you just replaced. The
   bump script prints the same instruction, and the pre-tag check below refuses
   to run the report when the two disagree.

   Delete every line the report says now reproduces, in the same commit that
   moves the pin. That is the step the drift file's own header already describes
   ("emptying this file is the normal end state after `npm run bump-carve-pin`")
   and the release process used to omit.

   The drift file is not the only thing a bump makes stale - extension
   classification and the Tier-3 snapshots go with it. `MAINTAINING.md`, under
   "What a pin bump has to sweep", is the list; do not move the pin without it.

   **The bar is accurate, not empty.** The pin is a git dependency on a carve-js
   COMMIT, `bump-carve-pin` will only move it to a merged one, and the order
   above releases `carve` FIRST - so at this repo's tag moment the corpus is
   routinely ahead of a build that has not shipped the newest rules yet, and a
   non-empty file is the correct state. What must hold is that every remaining
   entry names a rule the pinned build has not shipped. An entry whose rule the
   pin already reproduces is the "nobody ran the bump" case wearing the
   "corpus is ahead" label, and those are different facts.

   **Three more files declare the same kind of debt, and they read a different
   thing.** `engine:report` renders through the INSTALLED carve-js, so the pin
   is its whole input. These three drive all three engine CHECKOUTS:

   ```sh
   npm run ast:check   # resources/ast-value-divergence.txt, ast-span-divergence.txt
   npm run fmt:check   # resources/engine-fmt-drift.txt
   ```

   So their precondition is not the pin - it is that `../carve-js`, `../carve-rs`
   and `../carve-php` are at their `main` AND rebuilt. Pulling without rebuilding
   leaves the old binary in place and the gates read it. Measured 2026-08-14,
   stale checkouts reported carve-rs at 39 distinct AST findings where `main` had
   2, carve-php at 11 where it had 2, and four `fmt:check` failures that did not
   exist. Both gates fail in both directions, like the pin report, so reconciling
   means editing until they are green rather than appending.

   ```sh
   (cd ../carve-js  && git pull --ff-only && npm ci && npm run build)
   (cd ../carve-rs  && git pull --ff-only && cargo build --release)
   (cd ../carve-php && git pull --ff-only && composer install)
   ```
4. **Run the pre-tag check** (fails on a stale version field, an un-cut
   changelog, a dirty tree, a missing tag, an uninitialized spec submodule, or a
   drift entry the pinned build now reproduces):

   ```sh
   bash scripts/pre-tag-check.sh X.Y.Z
   # or, from another repo, point at this script:
   bash ../carve/scripts/pre-tag-check.sh X.Y.Z
   ```

5. Land steps 1-3 via a PR to `main` and merge it.
6. **Publish the prepared draft GitHub Release.** Publishing creates the tag at
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
- Never tag `carve` on a drift file nobody reconciled. CI gates that drift is
  DECLARED; only the step above gates that it is CURRENT.
- Never publish a version whose field or changelog does not match the tag.
- Never bump a version field except as part of a release (version numbers are
  release artifacts, not commit counters).
