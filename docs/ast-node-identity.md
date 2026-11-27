---
description: Authored ids, generated heading ids and node identity in editing tools.
---

# Node identity in parsed document JSON

An authored `attrs.id` identifies a document target. A generated heading `generatedId` is a render result. Neither is the identity of a tree node in an editing session. See [attributes](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#attributes) and [resolution results](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#resolution-results).

The 0.2 AST has no node-identity sidecar contract. A path identifies a location in one tree; moving or inserting a sibling can change it. An editor that needs identity across edits must manage it outside the 0.2 contract. See [C2-A-003 to C2-A-004](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars).

The 0.2 tooling contract does not require the 0.1 `readNodeIdentity` helper. Applications that need stable editor ids maintain their own mapping over each edit. The [upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#javascript-api) lists removed helpers.
