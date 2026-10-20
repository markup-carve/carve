# Carve specification sources

This directory contains the editable normative specification. Do not edit
`resources/grammar.ebnf` directly. It is the generated single-file distribution
used by existing tools and citations.

## Reading order

Read `00-preamble.ebnf` first for the notation, the guards and the layers.
Then the node vocabulary, the type names in `docs/profiles.md` that
`CARVE-P12-001` binds. Then PART 0 in `01-layout.ebnf`, which decides which
container owns each line before any production applies. The remaining
modules follow in filename order, PART 1 through PART 12.

## Editing the language

1. Edit the relevant `*.ebnf` module.
2. If a closed transition or target matrix changes, edit its JSON source too.
3. Run `npm run spec:write` to rebuild the aggregate.
4. Run `npm run spec:check` and `npm run spec:rules:check`.
5. Add or update a reviewed corpus pair for every observable behavior change.

The modules follow the parser and renderer pipeline. They are concatenated in
filename order, so their numeric prefixes are part of the build contract.

## Structured contracts

- `layout-transitions.json` restates the transition table of `CARVE-P0-003`.
  It is informative: the layout checker exposes it through
  `ownershipTransition`, which no parse path calls.
- `paragraph-interruption.json` is the closed classification defined by PART 9
  section 10.
- The interchange fallback table in `23-ast-foundations.ebnf` summarizes
  existing PART 12 rules. `spec:write` derives its docs view; `spec:check`
  validates its node/field names, rule IDs, actions and diagnostic codes.
- `target-capabilities.json` restates a sample of the cross-target rules of
  PART 11 sections 10a through 11, one row per named clause. The clause
  governs; the file is not the complete set.
- `rules.json` assigns one closed implementation scope to every clause carrying
  `-- NORMATIVE [CARVE-…]`; the source marker binds its stable ID directly.

Rule IDs are permanent. A rule title may be clarified by changing its `title`
in `rules.json`, but its ID must not be recycled. Adding a rule requires a new
ID in its PART. Removing a rule moves its registry entry from `rules` to
`retired` rather than assigning the ID to another rule. Every retired entry
keeps its last title and names a `replacement`; a Markdown replacement includes
the heading anchor that now owns the contract.

The five scopes are navigation metadata, not conformance profiles. Every active
rule belongs to exactly one scope, and `npm run spec:rules:write` generates the
focused pages under `docs/rules/`. Run `npm run spec:rules:check` to validate the
registry and reject stale generated pages.

The optional table-alignment mode has byte fixtures in
`table-alignment-fixtures.json`. Engines that offer it check their output and
fixed point against these cases. The fixture checker uses the W/F ranges in
`table-width-wide-18.json`, generated from Unicode 18.0.0
`EastAsianWidth.txt` (Unicode, Inc., https://www.unicode.org/terms_of_use.html).

## What belongs elsewhere

The normative modules contain productions, state, algorithms, invariants and
the smallest counterexample needed to distinguish a rule. Git history supplies
issue provenance. Put these elsewhere:

- retired readings and compatibility measurements: `docs/spec-history.md`
- implementation status and engine drift: `docs/implementation-comparison-methodology.md`
- extended examples: `resources/examples/` and `tests/corpus/`
- design rationale: `docs/technical-rationale.md`

`tests/normativity.test.mjs` enforces the boundary for known volatile headings
and verifies the structured contracts.
