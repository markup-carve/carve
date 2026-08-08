---
title: AST Source Layout Sidecar
description: Optional source fidelity metadata for editors and minimal-diff writers.
---

# AST source layout sidecar

The canonical [AST exchange format](./ast-json.md) describes meaning, not every
spelling choice. A source-aware consumer may explicitly request a separate,
versioned layout sidecar. It is never inserted into AST nodes: the document root
remains exactly `type`, `children`, and `srcByteLength`.

The machine-readable contract is
[`ast-source-layout-schema.json`](https://markup-carve.github.io/carve/ast-source-layout-schema.json).
Paths are RFC 6901 JSON Pointers into the accompanying canonical AST. Byte
ranges address the original UTF-8 input, start-inclusive and end-exclusive.
Entries are sorted by path and ranges must not exceed the UTF-8 source length.

Version 1 carries the original source, BOM and line-ending facts, plus ranges
for every honestly positioned node. Optional facts cover markers, content
columns, continuation style, blank lines, fences, attachments, and table
spelling. Missing means unknown, never a guessed default.

All producers consume the shared cases in
[`resources/ast-source-layout-fixtures.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-source-layout-fixtures.json).
`exact` compares complete sidecars; `sourceFacts` pins encoding facts while AST
position conformance independently tracks range agreement.

Default parsing, AST JSON, CLI JSON, and rendering do not change. An AST decoder
does not accept a sidecar as an AST, and a sidecar reader rejects versions it
does not implement.
