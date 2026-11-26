---
description: What the 0.2 specification checks cover, and what remains to be measured.
---

# Rule coverage

The 0.2 specification checks that its examples, clause cases, trees, data tables and references agree. They do not yet measure whether every clause would fail if an implementation broke it.

Run `npm run spec2:data` in the [spec repository](https://github.com/markup-carve/carve/tree/next2). It checks generated examples, clause references, case schemas, tree fixtures, catalog codes and options. The [status page](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md#gates) lists the gates and current counts. Engines run the [corpus](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md) separately.

The 0.1 `npm run rules:coverage` mutation gate applies to `resources/spec/` and `scripts/spec/`. Those are 0.1 artifacts. Its baseline and percentages cannot be carried over to 0.2.

A passing 0.2 corpus run shows agreement for the cases present. It does not establish coverage of every input a clause permits. When adding a rule or finding an uncovered boundary, add a focused clause case to the shared corpus.
