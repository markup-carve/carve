---
description: Authored ids, generated heading ids and node identity in editing tools.
---

# Node identity in parsed document JSON

An authored `attrs.id` identifies a document target. A generated heading `generatedId` is a render result. Neither is the identity of a tree node in an editing session. See [attributes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#attributes) and [resolution results](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#resolution-results).

The 0.2 AST treats node identity as an optional sidecar, not a field on every node. Like other sidecars, it addresses the tree it came with by RFC 6901 paths and is never encoded inside the tree. A path identifies a location in one tree; moving or inserting a sibling can change it. Rebind identity after edits rather than treating a path as a permanent id. See [C2-A-003 to C2-A-004](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#tree-and-sidecars).

The 0.2 tooling contract does not require the 0.1 `readNodeIdentity` helper. Applications that need stable editor ids maintain their own mapping over each edit. The [upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#javascript-api) lists removed helpers.
