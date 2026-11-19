---
description: Record where imported or generated content came from in an optional sidecar.
---

# Provenance in parsed document JSON

Use provenance when a tool needs to identify where imported or generated content came from. In 0.2, multi-source lineage and byte spans belong to an optional sidecar, separate from the semantic tree. It addresses one tree by JSON Pointer and needs rebinding after edits. See [tree and sidecars](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#tree-and-sidecars).

For a local foreign locator, a producer may declare the `carve.source` data namespace. A node's value can record the foreign format, a part, element path or id, and importer name and version. The core HTML renderer ignores this data, but tree equality compares it. The namespace does not replace the separate sidecar for multi-source lineage or byte spans. See [C2-A-190 to C2-A-196](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources).

An expanded include carries a `pos.file` id for its source input. That is a position coordinate, not an importer provenance graph. See [positions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#positions) and [include expansion](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md).
