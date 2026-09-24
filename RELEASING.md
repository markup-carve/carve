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

1. **Bump every field that states the version.** Three repos state it TWICE, and
   this list named only the manifests until `markup-carve/carve-js#1074`: an
   outside embedder found three published releases whose exported constant still
   read `0.1.0`, because the constant was not on any checklist.

   - `carve`, `tree-sitter-carve`: `package.json` `"version"`
   - `carve-js`: `package.json` `"version"` AND `src/version.ts` `LIB_VERSION`
   - `carve-rs`: `Cargo.toml` `version` (no separate constant; the build reports
     `CARGO_PKG_VERSION`)
   - `carve-php`: no manifest field - the version is derived from the git tag
     (Packagist) - BUT `src/CarveConverter.php` `LIB_VERSION` must be set to the
     target
   - `carve-rb`: `lib/carve/version.rb` `VERSION` AND `ext/carve/Cargo.toml`
     `version`
   - `carve-py`: `pyproject.toml` `[project] version` AND `Cargo.toml`
     `[package] version` - the second is what `carve.__version__` reports
   - `carve-lsp`, `carve-wasm`: `package.json` / `Cargo.toml` `version`

   "No manifest field" is not "nothing to bump": carve-php is the repo where
   that reading is most tempting and most wrong.
2. **Reconcile the CHANGELOG.** Make sure `## [Unreleased]` covers everything in
   the `lastTag..main` range (the draft release notes are the source of truth for
   scope), then cut it to `## [X.Y.Z] - YYYY-MM-DD` and open a fresh empty
   `## [Unreleased]` above it.

   Do not reconcile it by eye. The completeness gate names every merge whose
   diff moved shipped source and is cited nowhere in the section:

   ```sh
   npm run changelog:check                                  # before the cut
   npm run changelog:check -- X.Y.Z                         # after it
   ```

   With no version it reads every heading above the first tagged one, which is
   the section you are writing. It used to default to `package.json`'s version
   as of that version's own tag, so a bare run answered about a release that had
   already shipped and was green whatever the pending section said (carve#2238).

   It reads CHANGELOG.md from the git revision rather than the working tree, so
   commit the entries before believing a failure. Each repo has its own copy -
   `scripts/changelog-completeness.mjs` here, in carve-js and in
   tree-sitter-carve, `tools/check-changelog-completeness.py` in carve-rs,
   `scripts/changelog-completeness.php` in carve-php - and all four take the
   same arguments.
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
   changelog, a section that leaves merges uncited, a dirty tree, a missing tag,
   an uninitialized spec submodule, a drift entry the pinned build now
   reproduces, or three engines that do not pin the same spec commit):

   ```sh
   bash scripts/pre-tag-check.sh X.Y.Z
   # or, from another repo, point at this script:
   bash ../carve/scripts/pre-tag-check.sh X.Y.Z
   ```

5. Land steps 1-3 via a PR to `main` and merge it.
6. **Publish the prepared draft GitHub Release.** Publishing creates the tag at
   the current `main`; the tag then drives the registry publish.

## Editing a draft release: `-f` sends strings, and a string is not `false`

**Use `-F` for `draft`, never `-f`.** `gh api -f` sends every value as a JSON
string, so `-f draft=true` sends `"true"` - and GitHub coerces that string on a
boolean field to **false**. The call meant to keep a release a draft publishes
it, creates the tag, and the tag push runs whatever the release workflow does.

```sh
gh api repos/O/R/releases/$ID -X PATCH -f tag_name=X.Y.Z -F draft=true   # draft stays a draft
gh api repos/O/R/releases/$ID -X PATCH -f tag_name=X.Y.Z -f draft=true   # PUBLISHES it
```

That is not a hypothetical. On 2026-08-27 it published `vscode-carve` 0.1.3 to
the VS Code Marketplace and Open VSX from a call whose only intent was to
rewrite the release notes. Both publish steps had already succeeded by the time
the workflow was cancelled ~40 seconds later, and a marketplace version number
can never be reused.

**Read the field you changed back, not the field you remember.** Every checklist
here already says to resend `tag_name` and read it back, because an omitted
`tag_name` silently becomes `untagged-<hash>`. That guard was in place and it
did not help: it verified `tag_name` while `draft` was the field that moved. A
read-back is only worth what it reads.

```sh
gh api repos/O/R/releases/$ID --jq '{tag_name, draft}'   # both, every time
```

**The same coercion applies to every boolean the API takes** - `prerelease`,
`generate_release_notes`, `make_latest`. Reach for `-F` whenever the value is
not a string.

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

A third layer asks whether the section is COMPLETE rather than present. The
guards above pass on a section covering three of twenty-four merges, which is
the state four repositories were found in on 2026-09-22 - this one worst of
all, with 0.1.6 shipped and `[Unreleased]` still empty 33 merges later. The
completeness gate walks the merges back to the previous tag, asks GitHub what
each pull request closes (an entry cites the ISSUE, not the pull request), and
names every merge that moved shipped source and is cited nowhere:

- **carve-js, carve-rs, tree-sitter-carve**: a step in the release workflow,
  ahead of the publish step.
- **carve-php**: a tag-push Release Gate. The Packagist webhook cannot be held
  back, so it reports rather than blocks.
- **carve**: nothing publishes on a tag here, so the gate runs in
  `pre-tag-check.sh`, which is what stands between a draft release and the
  publish button. `.github/workflows/release-gate.yml` runs it again on the tag
  itself: that one cannot hold a release back, but it goes red while the tag is
  still young enough to move. Run it yourself any time with
  `npm run changelog:check`, and `.github/workflows/changelog-drift.yml` runs
  the same bare invocation daily against `main`, filing one tracking issue while
  the pending section is behind. That is the only thing that asks between a merge
  and a tag; per-pull-request is deliberately not where this lives, since only
  the release-cutting change writes a section.

What counts as shipped source differs per repository: `src/` in an engine, and
here the clause source, the grammar, the corpus source and the fixture sets an
engine vendors. The script's own header argues the cut, including what it
deliberately leaves out and which exclusion to revisit first. Deliberate
exclusions go in `.changelog-exempt` as `<number>: <reason>`; a bare number is
refused, and every exemption that applies is printed on a passing run.

A second layer guards the constants, which no publish workflow used to read.
Each of these fails on every push, not only at tag time, so a missed bump
surfaces in the PR that missed it:

- **carve-js**: `test/the-lib-version-constant-tracks-the-package-version.test.ts`
  ties `LIB_VERSION` to `package.json`.
- **carve-php**: `tests/TestCase/ReleaseVersionTest.php` - the only version
  check this repo has, since Packagist derives the version from the tag and
  nothing else compares the constant to anything.
- **carve-rs**: `tests/the_version_a_build_reports_is_the_one_that_shipped.rs`.
- **carve-rb**: `test/release_version_test.rb`, plus a tag guard in
  `.github/workflows/release.yml` that refuses to publish a gem whose
  `Carve::VERSION` is not the tag.
- **carve-py**: `.github/workflows/release.yml` has a tag guard, and it reads
  `pyproject.toml` ONLY. `Cargo.toml` carries the version `carve.__version__`
  actually reports, and no guard compares it to the tag; widening it, and the
  matching `tests/test_release_version.py`, is open in
  `markup-carve/carve-py#39`. Until that merges, check the second manifest by
  hand.
- **carve-wasm**: NO version guard on its publish workflow. `release.yml`
  publishes to npm on any `v*` tag with no tag-versus-`Cargo.toml` comparison,
  which is the one place in the org where a mistyped tag reaches a registry
  unopposed. Run the pre-tag check by hand before tagging it.

## The engines have to agree on which spec they implement

Each engine's CI runs `scripts/check-spec-pin-ancestry.sh`, which asserts its
pinned spec commit is reachable from spec `main`. That catches a pin left on the
pre-squash head of a merged branch, and it says nothing about how far behind the
pin is - a commit five hundred back is still reachable.

So carve-php pinned `6e78b03f` while carve-js and carve-rs pinned `c8164160`,
the AST schema change from #2197, and carve-php accepted two payload shapes the
other two refuse and refused one they accept. All three pin jobs were green, and
correctly so: reachability is a per-repo property, agreement is a fleet property,
and no per-repo gate can see it.

`pre-tag-check.sh` step 9 compares the `spec` (carve-js) and `tests/spec`
(carve-rs, carve-php) gitlinks across all three at `origin/main` and names each
repo, its pin and the distance between them. Run it on its own with:

```sh
npm run fleet:pin                  # the three engines at origin/main
npm run fleet:pin -- --ref worktree  # as they are checked out
```

A missing engine checkout fails rather than skipping - a fleet verdict computed
from two engines is not a fleet verdict, and the one that is missing is where a
divergence would sit. Point the run at a clone with `CARVE_JS_DIR`,
`CARVE_RS_DIR` or `CARVE_PHP_DIR`.

Holding one engine back is a legitimate call, so declare it in
`.fleet-pin-exempt` as `<repo>@<sha>: <reason>`. The reason is required, and
every exemption that applies is printed on a passing run. The sha is part of the
key: once that engine's pin moves, or once it rejoins the fleet, the line is
reported as stale and has to be renewed or deleted, so an exemption cannot
outlive the divergence it describes and cover the next one.

## Never

- Never tag before `pre-tag-check.sh` passes.
- Never tag a round in which the three engines pin different spec commits, unless
  the divergence is written down in `.fleet-pin-exempt` with its reason.
- Never pass a boolean to `gh api` with `-f`. It becomes a string, and a
  string on `draft` reads as false - see the section above.
- Never tag `carve` on a drift file nobody reconciled. CI gates that drift is
  DECLARED; only the step above gates that it is CURRENT.
- Never publish a version whose field or changelog does not match the tag.
- Never bump a version field except as part of a release (version numbers are
  release artifacts, not commit counters).
- Never leave a comment saying a version constant is kept in sync on release.
  That sentence is what let carve-js publish three releases whose exported
  constant read `0.1.0` (`markup-carve/carve-js#1074`, found by an outside
  embedder rather than by CI): the comment described an intention, every reader
  believed it, and nothing executed it. Point at the check instead - name the
  test or the workflow step that fails when the two disagree - so a reader can
  go see whether it still runs.
