---
title: Carve 0.2 specification
description: Where to find the 0.2 syntax and processing rules.
---

# Carve 0.2 specification

The 0.2 specification is a set of ten documents on the [`next2` branch](https://github.com/markup-carve/carve/tree/next2/spec/0.2). It is a [freeze candidate](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md), not a released standard. Its clauses use new identifiers such as `C2-B-001`; the 0.1 `CARVE-P` clauses do not define 0.2 behavior.

| Read | For |
|---|---|
| [Block syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) | Lines, containers, definitions, captions, tables |
| [Inline syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) | Delimiters, links, references, footnotes, text |
| [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) | Resolution and HTML output |
| [AST 2.0](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md) | Tree fields, equality, reading and migration |
| [Writer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md) | Canonical source, `fmt`, diagnostics and lint |
| [Source layout](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md) | Optional spelling facts beside the tree |
| [Includes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md) | Expansion, resolution, limits and dependencies |
| [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) | HTML to AST 2.0 and Carve source |
| [Tooling](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md) | Required library calls, CLI, flags and reports |
| [Extensions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md) | Registration, transformations and tabs |

The [status page](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md#what-is-not-frozen) marks the extension mechanism as provisional. The other nine documents are frozen for this candidate, subject to recorded rulings.

Each clause has examples or cases in the [shared 0.2 corpus](https://github.com/markup-carve/carve/tree/next2/spec/0.2/conformance). The JSON tables in [`data/`](https://github.com/markup-carve/carve/tree/next2/spec/0.2/data) make closed sets such as options, limits and node shapes inspectable. A clause governs if its table row disagrees with it.

For a reading order and implementation checks, see [Implementing Carve](./implementing-carve). For 0.1 source, use the [0.1 specification](https://github.com/markup-carve/carve/tree/0.1/resources/spec).
