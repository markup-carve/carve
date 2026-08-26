# Carve specification sources

This directory contains the editable normative specification. Do not edit
`resources/grammar.ebnf` directly. It is the generated single-file distribution
used by existing tools and citations.

## Editing the language

1. Edit the relevant `*.ebnf` module.
2. If a closed transition or target matrix changes, edit its JSON source too.
3. Run `npm run spec:write` to rebuild the aggregate.
4. Run `npm run spec:check` and `npm run spec:rules:check`.
5. Add or update a reviewed corpus pair for every observable behavior change.

The modules follow the parser and renderer pipeline. They are concatenated in
filename order, so their numeric prefixes are part of the build contract.

## Structured contracts

- `layout-transitions.json` is consumed by the executable layout checker.
- `paragraph-interruption.json` is the closed classification defined by PART 9
  section 10.
- `target-capabilities.json` records the cross-target behavior defined by PART
  11 sections 10a through 11.
- `rules.json` assigns stable IDs to clauses carrying `-- NORMATIVE`.

Rule IDs are permanent. A rule title may be clarified by changing its `title`
in `rules.json`, but its ID must not be recycled. Adding a rule requires a new
ID in its PART. Removing a rule retains the ID in review history rather than
assigning it to another rule.

## What belongs elsewhere

The normative modules contain productions, state, algorithms, invariants and
the smallest counterexample needed to distinguish a rule. Put these elsewhere:

- retired readings and compatibility measurements: `docs/spec-history.md`
- implementation status and engine drift: `docs/implementation-comparison.md`
- extended examples: `resources/examples/` and `tests/corpus/`
- design rationale: `docs/technical-rationale.md`

`tests/normativity.test.mjs` enforces the boundary for known volatile headings
and verifies the structured contracts.
