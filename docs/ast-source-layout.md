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
for every honestly positioned node. Everything else a node may carry is an
optional measured fact. Missing means unknown, never a guessed default: a
producer that did not measure a fact omits it, and a consumer must not read an
omission as a default value.

| fact | clause | what it measures |
| --- | --- | --- |
| `markerRaw` | §13 F1 | the marker that opened the node, as authored, separator excluded |
| `markerColumn` | §13 F2 | zero-based visual column of the marker, in PART 9 §24 C1 arithmetic - not `pos.startColumn`, which is 1-based and counts codepoints |
| `contentColumn` | §13 F3 | `content_column(node)` per PART 9 §24 C3, same zero-based arithmetic, so `- ` is 2 |
| `continuationStyle` | §13 F4 | how later lines reached the node, one value by precedence `explicit` > `lazy` (below the content column) > `indent` (reaching it) > `marker_line` > `none` |
| `blankLinesBefore`, `blankLinesAfter` | §13 F5 | authored count of whitespace-only lines around the node, inside its container |
| `openerRaw`, `closerRaw` | §13 F6 | the fence delimiter runs as authored. An unterminated block is `closerRaw` present and empty, never `closerRaw` omitted |
| `metadataSeparatorRaw` | §13 F7 | the separator run between a label or term and its body, whitespace included |
| `leadingPipe`, `trailingPipe` | §13 F8 | whether the row was authored with the optional pipes |
| `attachment` | §13 F9 | how the node reached its host: `preceding`, `continuation`, `detached`, `none` |

`paddingRaw` is declared by the schema and deliberately left undefined: one
string cannot hold both of a table cell's whitespace runs, and which run it
names has not been ruled (carve#1431). No producer emits it.

All producers consume the shared cases in
[`resources/ast-source-layout-fixtures.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-source-layout-fixtures.json).
`exact` compares complete sidecars; `sourceFacts` pins encoding facts while AST
position conformance independently tracks range agreement.

Default parsing, AST JSON, CLI JSON, and rendering do not change. An AST decoder
does not accept a sidecar as an AST, and a sidecar reader rejects versions it
does not implement.
