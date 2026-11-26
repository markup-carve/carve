---
description: How the 0.2 conformance corpus checks implementations.
---

# Conformance

Carve 0.2 is still a freeze candidate. No released engine conformance percentage is available for 0.2. The release table previously shown here measured 0.1 engines against a different corpus and does not describe 0.2.

The [0.2 corpus](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md) has three parts:

| File | Check |
|---|---|
| `examples.json` | Examples extracted from the ten normative documents |
| `clause-cases.json` | Cases that decide clauses beyond the examples |
| `refused-trees.json` | Trees an AST 2.0 reader must refuse |

Cases identify the operation, input, options and expected result. Depending on the case, engines compare HTML or canonical Carve byte for byte, a tree under [AST equality](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#equality), diagnostics, or a refusal. The corpus also includes include resolver fixtures. An unverified example has an expected result written from the clause but has not been confirmed by an engine; its status is visible in the JSON entry.

`npm run spec2:data` checks the corpus and the normative data tables for internal consistency. It does not run an engine. An engine runs the cases in its own test suite and reports differences by case ID. See [Implementation comparison methodology](./implementation-comparison-methodology) for how to interpret those results.
