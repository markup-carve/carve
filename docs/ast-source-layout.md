---
description: The source layout sidecar: byte ranges and written forms beside the tree.
---

# Source layout beside parsed document JSON

`parseWithLayout` returns a semantic tree and a source-layout sidecar. The tree records meaning; the sidecar records spelling and measured source ranges. AST JSON and rendering are the same whether or not a sidecar was requested. See [the source-layout contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md#what-the-sidecar-is).

The sidecar has `version: 2`, `encoding`, original `source`, `lineEndings`, `bom`, and a `nodes` list. Each entry has an RFC 6901 `path` and byte range. Entries may record facts such as a list's bare-dot spelling, a quote's fence form, table continuation wraps, or a reference's written form. Missing optional facts mean unknown; they do not assert a default. The [layout schema](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/layout-schema.json) defines the closed shape.

A sidecar belongs to the one tree returned with it. An edit can invalidate its paths. It does not survive a write; the new source has its own layout. If a sidecar contradicts the tree, the tree wins. A writer without a measured fact follows the defaults in the [source-layout specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md#defaults). See [shape](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md#shape) and [writer behavior](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#the-sidecar).
