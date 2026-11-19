# Parsed document JSON

Carve 0.2 exposes a versioned semantic tree. Use it when a tool needs document structure, references, or source positions. The [AST specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#tree-and-sidecars) defines the tree and separate records that accompany it.

## Get a tree

For example, this source has a heading and one paragraph:

```carve
= Hello

A *bold* word.
```

The reference engine installs the command as `carve`. `ast` writes a bare tree by default. Add `--envelope` at a storage or process boundary.

```sh
carve ast document.crv
carve ast --envelope document.crv
```

The JavaScript API offers `parse`, `parseWithDiagnostics`, `parseWithLayout`, `encodeTree`, `encodeEnvelope`, `decodeTree`, and `validateTree`. The [tooling contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#library) gives each call's inputs and outputs.

## Read the shape

The root is a `document` with `astVersion: "2.0"` and block `children`. Each node has a `type`. Nodes with literal text use `value`; containers use `children` or a declared named slot. Definitions and frontmatter are children of the document. A reader rejects unknown core fields and node types. See [root and versions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#root-envelope-and-versions) and [node grammar](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#node-grammar).

The schema is [`ast-schema.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/ast-schema.json). Walk child slots in the order of [`node-slots.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/node-slots.json). Searching every JSON object for `children` misses captions, metadata, extension slots, and other declared content.

## Meaning, positions, and spelling

Authored attributes are in `attrs`. Generated heading ids and resolved destinations are result fields on the resolved tree. Positions use one-based lines and Unicode code point columns, with zero-based UTF-8 byte offsets and exclusive ends. A position can be absent where the source has no single contiguous span. See [resolution results](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#resolution-results) and [positions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#positions).

The tree keeps meaning, while the [source-layout sidecar](./ast-source-layout.md) keeps author spelling. [Identity](./ast-node-identity.md), [annotation ranges](./ast-annotation-ranges.md), and [provenance](./ast-provenance.md) are also separate. They address one tree by JSON Pointer and need rebinding after edits.

## Edit or exchange a tree

Validate an external tree before rendering or writing it. `decodeTree` performs reader checks in addition to schema validation. `write` emits canonical Carve and reports facts it cannot spell. `migrateTree` and `carve migrate-ast` convert older trees; renaming `astVersion` alone is not migration. The [complete contract](./ast-json-contract.md) explains these boundaries.
