---
description: Attach comments or revisions to text ranges in a sidecar beside the parsed document tree.
---

# Annotation ranges in parsed document JSON

Annotation ranges let a host attach comments or revisions to text without changing the semantic tree. The range record is a sidecar that a caller supplies to `validateTree` or `decodeTree` for reader checks. It belongs to one tree and uses RFC 6901 paths into that tree. See [tree and sidecars](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#tree-and-sidecars) and [the range rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources).

## Anchors

Each range has a unique `id`, `start`, and `end`. An endpoint has a node `path` and a nonnegative `offset` measured in UTF-8 bytes of that node's annotation text. A reader rejects an offset inside a character. Annotation text uses a node's literal value or alternative text, then its declared child slots in walk order; a break contributes one line feed. A block boundary anchors at offset zero or the block's annotation-text length. The [range schema](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/annotation-ranges.schema.json) describes the JSON form.

## Host data and edits

The optional declared `carve.annotation` data namespace can list annotation ids on nodes. The core HTML renderer ignores it. A reader checks duplicate ids and, when given the sidecar, checks that each id binds to its node or a descendant. A tree round trip preserves paths and byte offsets, but edits require the host to rebind ranges. The contract does not promise automatic rebinding or persistence through canonical source writing. See [C2-A-202 to C2-A-207](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources).
