---
description: Set up, test, and maintain the Carve specification and documentation.
---

# Development

## Setup and maintenance

This repository contains the specification, corpus, and documentation site.

```bash
npm install
npm test
npm run docs:build
```

See [MAINTAINING.md](https://github.com/markup-carve/carve/blob/main/MAINTAINING.md)
for release and cross-implementation work.
The [container ownership map](./ownership-procedure) connects current rules
to collector phases, helpers and proof evidence.

## Nightly fuzz differential

`.github/workflows/nightly-fuzz.yml` runs at 05:30 UTC and on dispatch. It
mutates corpus documents that the spec model, carve-js, carve-php and carve-rs
already agree on, renders each mutant to HTML in all four and reduces every
disagreement while the same participants still disagree. Reduced cases are
grouped by a signature: which participants agree, plus the document with every
word replaced by `x`.

Each new signature becomes one issue labeled `bug` and `area:corpus`, holding
the reduced document, each output and the seed. A signature with an open issue
gets a comment instead; one with a closed issue is not refiled. At most ten new
issues go out a night, three per agreement pattern.

Findings leave the run green. It fails only when the harness breaks: an engine
missing, no mutant compared, fewer than half of the unmutated seed documents
agreeing, or `gh` failing.

Run it locally with the three engines checked out and built beside this
repository:

```bash
node scripts/fuzz-nightly.mjs --budget-minutes=2 --report=/tmp/fuzz.json
node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve --dry-run
```

The seed defaults to the UTC date (`20261029`). `--seed=N --max-mutants=M`
replays a night exactly, which is the line each issue prints.

## Conformance pack

`resources/conformance-pack/` holds about 12,000 generated cases, each a
mutated corpus row with the HTML the spec model gives for it. The cases come in
cause families (block ownership, lazy lines, footnotes, fences, `+`, inline
pairing, word-boundary guards, combined tokens, attribute blocks, writer round
trip); `index.json` lists them with their shards. carve-js, carve-php and
carve-rs run the pack in CI at their spec pin, so a variant of a fixed bug fails
the engine's own pull request instead of turning up in a later sweep.

`scripts/conformance-pack.mjs` builds it from a fixed seed and a frozen seed
list (`seeds.json`), so a new corpus row does not move the pack and the same
model always writes the same bytes. Case ids hash the source, so an id stays
the same when only the expected HTML changes.

When a spec model change moves a case, the `conformance-pack` CI job fails.
Regenerate and commit the result:

```bash
npm run pack:write   # rewrite resources/conformance-pack/
npm run pack:check   # what CI runs
```

`node scripts/conformance-pack.mjs --select-seeds` picks the seed rows again.
That moves every case, so do it only on purpose.

### In an engine

Each engine compares its HTML, trimmed, with `html` exactly. For a case in a
`roundtrip` family it renders its own `fmt` output of `source` instead.

| Engine | Test | Ledger |
| --- | --- | --- |
| carve-js | `test/conformance-pack.test.ts` | `test/conformance-pack-drift.json` |
| carve-php | `tests/ConformancePackTest.php` | `tests/fixtures/conformance-pack-drift.json` |
| carve-rs | `tests/conformance_pack.rs` | `tests/fixtures/conformance-pack-drift.json` |

A case that differs today is declared in the ledger. Each entry is one cause,
with its open ticket and the case ids it covers:

```json
{ "ticket": "markup-carve/carve-rs#1234", "cause": "lazy line after a nested note", "cases": ["notes-0123456789ab"] }
```

The test fails on a difference the ledger does not declare, on a declared case
that passes now, and on a declared id the pack no longer has. So when you fix a
cause, delete its entry. When a pin bump brings new differences, file a ticket
per cause and add an entry. If all three engines agree against the model on a
case, the ticket belongs in markup-carve/carve as a spec model bug, and every
engine's entry names that ticket.

Run the pack locally against a carve checkout instead of the pin with
`CARVE_CONFORMANCE_PACK=../carve/resources/conformance-pack`. The test's
failure message lists the ids to add to the ledger or remove from it.

## Diagnosing HTML drift

Run `npm run engine:report -- --structure` to add an HTML tree diagnostic to
each byte mismatch in the pinned engine's core-corpus report. Combine it with
`--diff` to see the bytes, or `--check` to check the declared drift ledger.
The report requires at least 100 corpus documents.

`same structure` means the HTML fragment trees agree after decoding entities
and sorting attributes. Parsed text whitespace, comments, attribute values,
namespaces, element order and template contents remain significant. Errors
reported by parse5, implied elements, omitted non-void end tags and initial
newlines that HTML discards in `pre`, `textarea` or `listing` produce
`unclassified`. Foreign elements without separate end tags are also
unclassified, including valid self-closing SVG or MathML elements.
Void-element slash spelling can still share a tree. Other tree differences produce
`different structure`.

This is supporting evidence, not a semantic-equivalence test. Browser parsing
can hide source distinctions, including raw HTML spelling and ignored tokens
that parse5 does not report as errors. It does not prove
AST identity, CSS behavior, accessibility or script behavior. Canonical bytes
remain the oracle: every byte mismatch still counts as drift, including one
marked `same structure`, and the exit status and ledger checks are unchanged.
