---
description: Work with the Carve 0.2 specification and documentation.
---

# Development

The `main` branch contains the 0.2 specification in [`spec/0.2/`](https://github.com/markup-carve/carve/tree/main/spec/0.2) and this documentation source. Its status page, linked at the end of this page, identifies the freeze candidate and its open points.

## Set up the repository

Use the Node version in `.nvmrc`, install dependencies with `npm ci`, and run `npm run docs:build` for the site. Read the [specification map](./grammar) before changing normative text. The 0.1 oracle (`resources/spec/`, `scripts/spec/`, `resources/conformance-pack/` and the 0.1 corpus) lives on the [`0.1` branch](https://github.com/markup-carve/carve/tree/0.1); it is not the 0.2 oracle.

## Check the 0.2 spec

Run `npm run spec2:data` after changing a 0.2 document, data row, example or conformance case. It checks schemas, clause references, generated examples and tree fixtures. See [Conformance](./conformance) for what an engine must run. When changing a clause, add or adjust the case that demonstrates it and update the upgrade map (`spec/0.2/data/upgrade-map.json`) when 0.1 source changes meaning.

The reference implementation lives in [`carve-js` on `main`](https://github.com/markup-carve/carve-js/tree/main). Its `carve` program exposes render, AST, format, diagnostics, lint, import and migration commands. The required surface is in the commands section of the tooling chapter (linked below); its `upgrade` command is specific to the JavaScript reference engine.

## Investigate a mismatch

Record the spec pin, engine pin, case ID, input, options, expected and actual results. Compare the cited clause before changing either side. The [comparison methodology](./implementation-comparison-methodology) describes what a corpus pass measures. The 0.1 decision trace uses the 0.1 model, so its output does not decide a 0.2 case.

## Check an Expected section before filing

A bug ticket states its expected result. Before filing it, write each expected result as a case and run `npm run expected:check -- <cases.crv>` with a carve-js `main` checkout in `engines/carve-js` (or `CARVE_JS_DIR`, or `--js <dir>`). The case file is Carve 0.1: a `##` heading per case (a 0.2 `==` heading works too), an `operation` of `fmt`, `html`, `ast` or `lint`, optional `clauses` and `options`, then the input block and the expected block (the language after a fence is free).

````text
## 6569 editorial comment across a comment line

- operation: ast
- clauses: C2-B-138

```text
{#a
%% b#}
```

```json
[{"type":"paragraph","children":[{"type":"text","value":"{"},{"type":"tag","name":"a"},{"type":"soft_break"},{"type":"comment","form":"line","value":"b#}"}]}]
```
````

`ast` expects the JSON children of the document without positions, `lint` one rule code per line with an optional `line:column`. For each case the check runs carve-js and reports where its output differs. Where it differs, it also lists the clause cases on the same constructs: a clause case with the same input, and those whose model trees share the node kinds the expected result disputes (for `fmt`, the kinds the text forms with its escapes dropped). Each listed case says whether carve-js passes it now and which clauses it cites. The command exits 0 when every case agrees with carve-js, 1 on a conflict and 2 on a tool error. `--help` prints the format.

A conflict with a clause or a pinned clause case is filed as `needs-decision` with both readings, not as a bug with that Expected section.

## Versioned documentation deployment

The Pages workflow on `main` runs `scripts/build-versioned-docs.sh`. It checks out `origin/0.1` in a separate worktree, installs that ref's own dependencies and builds it at `/carve/` as "0.1 (latest)". It then builds the `main` checkout itself at `/carve/0.2/` as "0.2 (dev)" and combines only the finished site files. A plain `npm run docs:build` still builds one site at `/carve/` without a version menu.

When 0.2 becomes the latest release, change the defaults in the script: build `main` at `/carve/` as "0.2 (latest)" (`DOCS_LATEST_REF` empty, `DOCS_LATEST_EDIT_BRANCH=main`) and `origin/0.1` at `/carve/0.1/` as "0.1 (legacy)" (`DOCS_SECONDARY_REF=origin/0.1`, `DOCS_SECONDARY_EDIT_BRANCH=0.1`, `DOCS_SECONDARY_SERIES` empty), and set `DOCS_REDIRECT_BASES=/carve/0.2/`. Each ref keeps its own config, theme, playground, WASM files, package files and engine pin.

A version path stays valid while that version is latest. `DOCS_REDIRECT_BASES` lists those paths, separated by spaces. For each one, `scripts/write-docs-redirects.mjs` writes a stub for every page of the latest build: a canonical link, an instant meta refresh and a script that keeps the query and hash, so playground share links survive. It also patches the root `404.html` to send any other path under those bases to the same page under `/carve/`. GitHub Pages cannot send a real 301, and search engines treat an instant meta refresh as a permanent redirect. When 0.3 ships, `/carve/0.2/` becomes the legacy build and `/carve/0.3/` takes its place in `DOCS_REDIRECT_BASES`. The script refuses a redirect base that already holds a build.

## Nightly fuzz differential

`.github/workflows/nightly-fuzz.yml` runs every day at 05:45 UTC and on dispatch. It checks out carve-js, carve-php and carve-rs at their `main` heads and runs `scripts/fuzz-nightly.mjs`: mutants of the 0.2 conformance inputs, random documents, deep nesting around the depth limits (C2-B-190, C2-I-118) and line-ending, tab and control-character noise go through parse, render, format and lint in each engine. The run compares the tree, the HTML, the fmt output and the lint findings across the engines, checks the writer gates C2-W-002 and C2-W-003 in each engine, imports the rendered HTML in every engine, and times long inputs of each construct. A crash, a hang, an error that is not a Carve refusal and superlinear time are reported per engine. There is no spec model at the engine heads, so a split where two engines agree is a lead for triage, not a verdict.

Every finding is reduced while it holds and grouped by a signature: the target, the agreement pattern and the input with each word replaced by `x`. `scripts/fuzz-file-issues.mjs` files one issue per new signature, crashes, hangs and superlinear time first, at most five a night; it comments on an open issue with the same signature and skips a closed one. Lint splits are not filed: [`scripts/lint-parity.mjs`](https://github.com/markup-carve/carve/blob/main/scripts/lint-parity.md) covers lint. A dispatch files only with `file-issues` set.

Run it locally with the engines built in `engines/` (as for the readiness run):

```bash
cargo build --release --manifest-path scripts/next2-readiness-rs/Cargo.toml
export CARVE_RS_READINESS_BIN=$CARGO_TARGET_DIR/release/carve-next2-readiness
node scripts/fuzz-nightly.mjs --seed=7 --budget-minutes=5 --report=/tmp/fuzz.json
node scripts/fuzz-nightly.mjs --timing --timing-only --timing-sizes=4000,16000,64000 --report=/tmp/timing.json
node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve --dry-run
```

The seed defaults to the UTC date, and the same seed gives the same inputs.

**Specification (external):** [status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md), [tooling commands](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#commands), [upgrade map](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/upgrade-map.json).
