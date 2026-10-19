# Lint rule vectors

Cross-engine vectors for single lint rules, one file per rule id, named
`<rule>.json`. Engines vendor this directory through their spec submodule.

## Running a vector

1. Lint `source` with default options.
2. Keep the findings whose rule id is the file's `rule`, in the order the
   linter reports them.
3. Compare their `(line, column)` pairs with `expected.findings` exactly.
   Lines and columns are 1-based; columns count codepoints.
4. Each finding's message must contain the expected `word` and the suggested
   key in braces (`{table}`). The rest of the wording is the engine's own.

A vector with no expected findings is a negative: the rule must not fire.
`tests/lint-rule-vectors.test.mjs` checks the shape and runs every vector
through the pinned carve-js build once it carries the rule.
