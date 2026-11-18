# Parsed document JSON contract

This page maps integration tasks to the Carve 0.2 tree contract. The normative rules and examples are in the [AST specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md) and [JSON schema](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/ast-schema.json). The 0.1 contract does not describe a 2.0 tree.

## Serialization boundary

An in-memory handoff may use the bare `document` tree. Storage and process boundaries use an envelope with matching `astVersion` values on the envelope and document. Version `2.0` describes the AST contract, not the language version. A reader refuses a higher major, unknown required extension, unknown core field or node type, and an invalid fallback. See [root, envelope, and versions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#root-envelope-and-versions).

## Nodes and children

`type` identifies every node. `children` is the primary content slot. `value` holds literal payload where the type permits it. Named slots include captions, titles, table columns, citation parts, metadata, and extension slots. [`node-slots.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/node-slots.json) defines traversal order. Opaque `data` and extension `props` are never searched for nodes.

`attrs` holds an authored id, classes, and ordered key-value pairs. A generated heading id is `generatedId`, a resolution result. The result fields are enumerated in [`ast-results.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/ast-results.json). The renderer recomputes result fields when it resolves a supplied tree. See [attributes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#attributes) and [resolution results](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#resolution-results).

## Equality and source data

Tree equality compares semantic fields after text coalescing. It ignores source geometry and specified resolution fields. Source spelling belongs in [source layout](./ast-source-layout.md); source positions are optional node fields. Diagnostics are a record beside the tree. A tree reconstructed from JSON retains its positions, while an imported tree without Carve source has none. See [equality](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#equality), [positions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#positions), and [diagnostics](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#diagnostics).

## Reading, writing, and migration

Schema validation alone is insufficient. `decodeTree` and `validateTree` also enforce cross-field checks, nesting limits, positions, references, extension declarations, and fallback validity. Refusals are typed errors with a JSON path. A writer reports unspellable interchange fields rather than inventing source. Use `migrateTree` or `carve2 migrate-ast` for 1.x and draft trees. See [reading a tree](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#reading-a-tree), [shapes source cannot spell](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell), and [migration](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#migration).

## Changed in 0.2

The [upgrade index](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#part-3-tree-consumers-ast-1x-to-20) maps 1.x fields to 2.0. Tables use groups and cell paragraphs, lists use `children`, `attrs.keyValues` is an ordered list of pairs, block images are paragraphs with `role: "image"`, and layout-only fields moved to a sidecar. Migrate an old tree before passing it to a 2.0 reader.
