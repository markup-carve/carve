---
description: Record a local foreign locator in the 0.2 tree.
---

# Provenance in parsed document JSON

Use `carve.source` when a tool needs a local foreign locator for imported content. The 0.2 contract has no provenance sidecar for multi-source lineage or byte spans. See [tree and sidecars](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#tree-and-sidecars).

For a local foreign locator, a producer may declare the `carve.source` data namespace. A node's value can record the foreign format, a part, element path or id, and importer name and version. The core HTML renderer ignores this data, but tree equality compares it. The 0.2 contract does not define a sidecar for multi-source lineage or byte spans. See [C2-A-190 to C2-A-196](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources).

An expanded include carries a `pos.file` id for its source input. That is a position coordinate, not an importer provenance graph. See [positions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#positions) and [include expansion](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md).
