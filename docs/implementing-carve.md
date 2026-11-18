---
description: A reading and test path for a Carve 0.2 implementation.
---

# Implementing Carve 0.2

Start with the [status and document map](https://github.com/markup-carve/carve/blob/next2/spec/0.2/README.md). This is a freeze candidate; the extension mechanism remains provisional. Do not use the 0.1 aggregate EBNF or its `scripts/spec` model as a 0.2 oracle.

## Reading order

1. Read [block syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) to build the parser.
2. Read [AST 2.0](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md) and its [schema](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/ast-schema.json). Keep author spelling in the separate [source-layout sidecar](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md).
3. Read [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) for resolution and rendering, then [writer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md) for canonical source, formatting and diagnostics.
4. Add [includes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md), [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md), and the [tooling contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md). Read [extensions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md) when implementing its provisional interface.

## Test against the shared cases

Pin a specific `next2` commit and record that pin in your engine. Read the three JSON files in [`spec/0.2/conformance/`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md). Run each entry's operation with its options and compare the expected fields. Use the case ID in failure reports. The [tree fixtures](https://github.com/markup-carve/carve/blob/next2/spec/0.2/trees/README.md) exercise valid, imported and refused ASTs plus layout sidecars.

Run `npm run spec2:data` in the spec checkout to verify the corpus before interpreting a mismatch. Examples marked unverified are provisional evidence from the clauses; check the clause before treating a mismatch as an engine defect. The [comparison methodology](./implementation-comparison-methodology) explains the limits of a pass rate.

The required API and command surface are in [tooling](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#library). A port may use its language's naming conventions for calls and errors. The reference TypeScript engine is [`carve-js` on `next2`](https://github.com/markup-carve/carve-js/tree/next2/v2); its CLI is named `carve2` so it can coexist with 0.1.
