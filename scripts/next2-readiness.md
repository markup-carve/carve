# Carve 0.2 engine readiness gate

`next2-readiness.mjs` replays the 0.2 clause cases, examples and tree fixtures through the JavaScript, PHP and Rust 0.2 engines, and the 0.1 conformance pack and examples through the JavaScript upgrade path. It compares the outcome with `next2-readiness-baseline.json`.

## What fails the job

The baseline stores, for every case key (`area/kind/id`), a fingerprint of everything the runner feeds an engine and compares against: the case without its prose fields (`why`, `summary`, `clauses`, ...) plus the message templates of the lint rules the case expects. It also stores each engine's non-passing cases.

Each case falls in one class:

- **Regression**: the key and fingerprint match the baseline and the case now does worse (pass to fail, pass or fail to unsupported). This fails the job.
- **Expected gap**: the case is new, or its fingerprint changed (the PR changed its input or expected output), and it does not pass. Reported, never failing.
- **Known failure**: unchanged and still failing as in the baseline. Reported.
- **Newly passing**: unchanged and better than the baseline. Reported; advance the baseline to keep it.

Expected gaps are split into those listed in the "Engine gaps" sections of `spec/0.2/STATUS.md` (by case id, or by a clause id the case cites) and unlisted ones. An unlisted gap is a prompt to add the case to STATUS.md or to fix the case.

Upgrade replay sources are grouped by file. A newly blocked source is a regression only when its file is unchanged since the baseline.

Each blocked upgrade source gets a class (carve#6163, carve#6164):

- **(b) tool defect**: the upgrade threw, or a `rewrite` or `escape` row of `spec/0.2/data/upgrade-map.json` is cited on the line of the residual mismatch.
- **(d) unmapped**: no row explains the difference.
- **(a) report row**: only `report` or `none` rows are cited on the mismatch line; a person decides.
- **(c) malformed 0.1 source**: the frozen 0.1 lint reports a rule from `next2-readiness-malformed.json` on the mismatch line, or anywhere in a source with no mapped row.

Only (b) and (d) count against the carve-js upgrade bar. All four are listed in the report, and all four are in the regression gate: a blocked source of an unchanged file that moves from (a) or (c) to (b) or (d) is a regression too.

Aggregate counts, per-rule catalog percentages and lint agreement are reported in the summary but do not fail the job: adding a case moves them without anything regressing.

Catalog rows with status `obsolete` or `void` remain in the historical data but are excluded from the shared trigger denominator. The report counts them separately as "Excluded: obsolete/void". The job fails if an engine emits either kind on a clause case. A rule with status `engine-local`, such as the C2-W-133 `writer-refused` repair guard, is counted separately and verified by engine implementation tests rather than a shared clause case.

## Which engines are replayed

- **Pull requests** (`baseline` mode) replay the engine commits named in `engineHeads` of the baseline, so a red run means this PR regressed spec data, a generator or the runner.
- **Pushes to next2** run `baseline` mode and also `heads` mode on the engine next2 heads. In `heads` mode a regression is an engine regression; on pushes and the daily schedule it is reported as a warning, not a failure.
- **Manual runs** (`workflow_dispatch`) replay the given engine refs, for example `refs/pull/N/head` of an engine PR, and fail on any regression.

Every run uploads `_readiness-baseline.json`, the baseline it would write.

## Advancing the baseline

```sh
npm --prefix scripts run readiness:next2 -- --write-baseline
```

This fetches and builds the engine next2 heads, replays them and writes the baseline. It refuses to write over a regression; `--force` overrides that, with the reason in the commit message. A spec PR that adds or changes cases may advance the baseline in the same PR, so the new expectations become the comparison point. `--baseline-heads` replays the engine commits the baseline names instead of next2.
