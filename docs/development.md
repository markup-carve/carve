---
description: Work with the Carve 0.2 specification and documentation.
---

# Development

The `next2` branch contains the 0.2 specification in [`spec/0.2/`](https://github.com/markup-carve/carve/tree/next2/spec/0.2) and this documentation source. The [status page](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) identifies the freeze candidate and its open points.

## Set up the repository

Use the Node version in `.nvmrc`, install dependencies with `npm ci`, and run `npm run docs:build` for the site. Read the [specification map](./grammar) before changing normative text. The 0.1 oracle (`resources/spec/`, `scripts/spec/`, `resources/conformance-pack/` and the 0.1 corpus) lives on the [`0.1` branch](https://github.com/markup-carve/carve/tree/0.1); it is not the 0.2 oracle.

## Check the 0.2 spec

Run `npm run spec2:data` after changing a 0.2 document, data row, example or conformance case. It checks schemas, clause references, generated examples and tree fixtures. See [Conformance](./conformance) for what an engine must run. When changing a clause, add or adjust the case that demonstrates it and update the [upgrade map](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/upgrade-map.json) when 0.1 source changes meaning.

The reference implementation lives in [`carve-js` on `next2`](https://github.com/markup-carve/carve-js/tree/next2). Its `carve` program exposes render, AST, format, diagnostics, lint, import and migration commands. The required surface is in the [tooling specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#commands); its `upgrade` command is specific to the JavaScript reference engine.

## Investigate a mismatch

Record the spec pin, engine pin, case ID, input, options, expected and actual results. Compare the cited clause before changing either side. The [comparison methodology](./implementation-comparison-methodology) describes what a corpus pass measures. The 0.1 decision trace uses the 0.1 model, so its output does not decide a 0.2 case.

## Nightly fuzz differential

`.github/workflows/nightly-fuzz.yml` runs every day at 05:45 UTC and on dispatch. It checks out carve-js, carve-php and carve-rs at their `next2` heads and runs `scripts/fuzz-nightly.mjs`: mutants of the 0.2 conformance inputs, random documents, deep nesting around the depth limits (C2-B-190, C2-I-118) and line-ending, tab and control-character noise go through parse, render, format and lint in each engine. The run compares the tree, the HTML, the fmt output and the lint findings across the engines, checks the writer gates C2-W-002 and C2-W-003 in each engine, imports the rendered HTML in every engine, and times long inputs of each construct. A crash, a hang, an error that is not a Carve refusal and superlinear time are reported per engine. There is no spec model on `next2`, so a split where two engines agree is a lead for triage, not a verdict.

Every finding is reduced while it holds and grouped by a signature: the target, the agreement pattern and the input with each word replaced by `x`. `scripts/fuzz-file-issues.mjs` files one issue per new signature, crashes, hangs and superlinear time first, at most five a night; it comments on an open issue with the same signature and skips a closed one. Lint splits are not filed: [`scripts/lint-parity.mjs`](https://github.com/markup-carve/carve/blob/next2/scripts/lint-parity.md) covers lint. A dispatch files only with `file-issues` set.

Run it locally with the engines built in `engines/` (as for the readiness run):

```bash
cargo build --release --manifest-path scripts/next2-readiness-rs/Cargo.toml
export CARVE_RS_READINESS_BIN=$CARGO_TARGET_DIR/release/carve-next2-readiness
node scripts/fuzz-nightly.mjs --seed=7 --budget-minutes=5 --report=/tmp/fuzz.json
node scripts/fuzz-nightly.mjs --timing --timing-only --timing-sizes=4000,16000,64000 --report=/tmp/timing.json
node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve --dry-run
```

The seed defaults to the UTC date, and the same seed gives the same inputs.
