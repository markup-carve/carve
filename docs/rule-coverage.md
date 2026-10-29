---
description: The rule-coverage gate checks that the core corpus can detect a broken implementation of each normative rule.
---

# Rule Coverage

A corpus row proves a rule only if it fails when the rule is implemented wrong.
The rule-coverage gate measures that directly. For each normative rule, it
breaks the spec model code that implements the rule. Then it checks that at
least one core corpus row renders different HTML.

```bash
npm run rules:coverage                         # check against the baseline
npm run rules:coverage -- --base=origin/main   # also refuse a grown baseline
npm run rules:coverage -- --rules=CARVE-P0-001,CARVE-P3-023
npm run rules:coverage -- --full               # all killing rows, plus redundant rules
npm run rules:coverage -- --write              # record the measured state
```

## What it measures

- **Gated rules.** Every rule in `resources/spec/rules.json` whose scope is
  listed in `resources/rule-coverage/mutations.json`. The scopes are
  `parsing`, `resolution-rendering`, and `imports-security-extensions`. These
  are the rules the HTML model in `scripts/spec` renders. The AST interchange
  and canonical writing scopes are not gated, since the model has no corpus
  oracle for them.
- **Mutations.** Each entry in `mutations.json` names a rule and one or more
  exact edits to the model source (`scripts/spec/*.mjs`,
  `resources/carve-core.ohm`, or the model's `resources/spec/*.json` tables).
  A `find` must match exactly once, so a refactor that moves the code makes
  the entry fail loudly instead of passing silently. Spell a source backslash
  before `u` as `\u005c`, since `tests/json-holds-utf8.test.mjs` reads `\\u`
  followed by four hex digits as an escaped character. The edit disables or
  inverts the rule's own behavior, such as deleting a guard or flipping a
  condition. It should not break documents in general.
- **Killed.** The tool copies the model, applies the edits, and renders every
  core corpus row (`tests/corpus`). The first row whose HTML differs from its
  committed `.html` kills the mutation. A crash or hang also counts as a kill.
- **Uncovered.** A gated rule is uncovered when its mutation survives every
  row, or when it has no mutation. Rules with no mutation are listed under
  `unmapped` with a reason. Usually the reason is that the model has no code
  for the rule, such as importer behavior or a lint diagnostic.
- **Redundant** (`--full` only). Two rules are redundant when their
  mutations fail exactly the same set of rows. The corpus cannot tell them
  apart, so a row that separates them is worth adding. This is reported, not
  gated.

Before measuring, the unmutated model must pass every row. Otherwise a row
that already fails would look like a kill.

## The ratchet

`resources/rule-coverage/baseline.json` lists the uncovered rules and, for each
covered rule, the row that killed it. The check tries that row first, so a
covered rule costs one row instead of the whole corpus.

The check fails when:

- a gated rule is uncovered and the baseline does not list it, including a
  new rule id that lands without a killing row;
- the baseline lists a rule that is covered now. Run `--write` to remove it;
- with `--base`, the baseline lists a rule that the base branch's baseline did
  not, because the uncovered list may only shrink.

So a new rule id needs a mutation entry and a corpus row that kills it in the
same pull request. To cover an uncovered rule, add a row (through
`resources/examples`, like any corpus case) or a better mutation, then run
`--write`.

## In CI

The `rule-coverage` job in `.github/workflows/ci.yml` runs on pull requests
that touch `resources/spec`, `scripts/spec`, `resources/carve-core.ohm`,
`resources/rule-coverage`, the corpus, or the tool itself. It runs with
`--base` set to the pull request's base branch.

## Limits

A killed mutation shows that some row depends on the code site. It does not
show that the row tests the rule's whole clause. One mutation per rule
samples one way the rule can be broken. The gate only sees the core corpus,
not the optional, convert, or round-trip corpora.
