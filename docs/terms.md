---
title: Terms used in this documentation
description: Definitions for Carve-specific and markup-language terms.
---

# Terms Used in This Documentation

These terms follow the [0.2 specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md).

| Term | Meaning |
|---|---|
| Source | The authored `.crv` text. |
| Block | A document part such as a paragraph, list, table, or div. |
| Inline | Content inside a block, such as text, a link, or emphasis. |
| Tree | The resolved 2.0 document structure; see the [AST contract](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md). |
| Layout sidecar | Source spelling and placement facts stored beside a tree; see [source layout](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md). |
| Canonical writer | The writer that spells a tree as canonical Carve source; see [writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md). |
| Diagnostic | A structured finding in the parse, render loss, or lint channel; see [tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#diagnostics-and-reports). |
| Include resolver | Host code that reads an allowed included file; see [includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md). |
| Extension | A registered transformation with a core fallback; see [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md). |

A syntax feature of the core language does not require an extension registration. A host option changes processing or output without changing the source grammar. An included file is authored source, while a layout sidecar is a record of how source was written.

## Established documentation terms

- **Core syntax**: source forms every 0.2 parser recognizes without an extension.
- **Optional feature**: behavior a host enables through an option or registered extension; the source alone does not require the host to provide it.
- **Abstract syntax tree (AST)**: the typed 2.0 document tree after parsing and resolution.
- **Output warning**: a diagnostic, usually in the render loss channel, that reports a representation problem; the record gives its code and severity.
- **Fallback output**: the core rendering of an extension node's valid fallback when its extension renderer is unavailable.
- **Raw HTML passthrough**: explicit raw source emitted only for HTML output when the host enables raw HTML.
