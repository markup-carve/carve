---
description: Current implementation choices for Carve 0.2.
---

# Compare implementations

Carve 0.2 is under development. [`carve-js` on `main`](https://github.com/markup-carve/carve-js/tree/main) is the reference implementation for the candidate specification. The released JavaScript, PHP and Rust engines implement 0.1. Their 0.1 conformance and speed measurements do not establish 0.2 support.

| Need | Current 0.2 path |
|---|---|
| Parse, render, format or lint | The `carve-js` 0.2 branch and its `carve` CLI |
| Implement another language | Pin the [0.2 spec](./grammar) and run its [shared corpus](./conformance) |
| Migrate 0.1 documents | Read the [upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md) and test the reference engine's `upgrade` command |
| Use a released implementation today | Use the [0.1 site](https://markup-carve.github.io/carve/) and a released engine |

The 0.2 required output is HTML, canonical Carve source and AST 2.0. The Markdown, plain text and ANSI writers are outside 0.2.0 ([writer, Out of scope](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#out-of-scope)). For importing Markdown, the JavaScript reference engine offers an extra importer; the common 0.2 contract is HTML import ([tooling, Scope](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#scope)).

See [methodology](./implementation-comparison-methodology) before comparing future engine results. The [performance page](./performance) will publish 0.2 measurements after a benchmark rerun.
