---
description: Attach comments or revisions to text ranges in a sidecar beside the parsed document tree.
---

# Annotation ranges in parsed document JSON

Carve represents inline formatting as nested nodes. That is the right model for a document and the wrong one for a range that does not nest: a review comment that starts inside one emphasis and ends inside the next, a search hit that crosses a link boundary, a collaborator's cursor.

Such ranges travel in a separate JSON object beside the [parsed document JSON](/ast-json), called the **annotation-range sidecar**. The tree does not change when ranges exist, two documents that differ only in their ranges are the same document, and the canonical HTML renderer never reads them. A host supplies the sidecar to `validateTree` or `decodeTree` when it wants the engine to check it against a tree.

## A worked example

A reviewer selects `part and that` in this sentence:

```crv
Fix /this part/ and *that part* today.
```

The paragraph in the tree, from `carve ast --no-positions`:

```json
{"children":[{"type":"text","value":"Fix "},{"children":[{"type":"text","value":"this part"}],"type":"emphasis"},{"type":"text","value":" and "},{"children":[{"type":"text","value":"that part"}],"type":"strong"},{"type":"text","value":" today."}],"type":"paragraph"}
```

The selection starts inside the emphasis and ends inside the strong, so no single node holds it. The host stores it as a range whose two endpoints name different nodes:

```json
{
  "ranges": [
    {
      "id": "comment-12",
      "start": { "path": "/children/0/children/1", "offset": 5 },
      "end": { "path": "/children/0/children/3", "offset": 4 }
    }
  ]
}
```

`/children/0/children/1` is the emphasis, whose annotation text is `this part`; offset 5 falls before `part`. `/children/0/children/3` is the strong, whose text is `that part`; offset 4 falls after `that`. The host checks the record against the tree before it draws a highlight:

```js
import { parse, validateTree } from '@markup-carve/carve'

const tree = parse(source)
validateTree(tree, { annotations: sidecar }) // throws CarveTreeError on a bad range
```

`decodeTree(json, { annotations: sidecar })` runs the same checks while reading stored JSON.

## Shape

The sidecar is an object with one field, `ranges`. Each range has:

| Field | Value |
| --- | --- |
| `id` | a nonempty string, unique among the ranges |
| `start`, `end` | endpoints, each with `path` and `offset` |
| `data` | optional; keys must be qualified names declared on the tree's root or envelope |

`path` is an RFC 6901 pointer into the tree the sidecar belongs to. `offset` is a nonnegative integer counted in UTF-8 bytes of the addressed node's annotation text. Every object is closed: a reader refuses any other field.

## Annotation text

The annotation text of a node is a projection of the tree, defined independently of JSON member order:

1. the node's own `value` or `alt` string, or `source` for a `smart_punctuation` node;
2. then the annotation text of each child slot, in the order of `spec/0.2/data/node-slots.json`.

A `soft_break` or `hard_break` contributes one line feed, and a `non_breaking_space` contributes U+00A0. Nothing else is added: attributes, URLs, and opaque data contribute nothing, and no separator goes between blocks. The text of a document with the paragraphs `One.` and `Two.` is `One.Two.`, eight bytes.

For this paragraph, which holds an emoji, an image, a hard break, and inline math:

```crv
A😀 ![cat](c.png)\
$`x^2`
```

the annotation text is `A😀 cat`, a line feed, and `x^2`: 13 bytes, since the emoji takes four. A range may end at offset 13 of `/children/0`. Offset 14 is refused, and so is offset 2, which falls inside the bytes of the emoji.

Smart punctuation counts as typed, not as rendered. `"Hi"` contributes one byte per straight quote, not the three bytes of each curly quote the renderer prints. The projection gives tree offsets, not offsets into rendered text.

## Placing endpoints

`start` and `end` may name different nodes; that is how a range crosses a boundary the tree does not let it nest inside. Two ranges may cross each other freely, and nothing rebrackets them. A range whose endpoints are equal is an empty point, such as a cursor.

At a block boundary, an endpoint uses the containing block's path with offset 0 for a start, or the block's annotation-text length for an end. A boundary between two blocks uses the end of the block before it, or the start of the block after it when there is none before. The only boundary in an empty document is the root path `""` with offset 0.

## Marking nodes with `carve.annotation`

A tree can also list, on a node, the ids of the ranges that touch it. This uses the standard data namespace `carve.annotation`, which must be declared on the root or envelope like any `data` key:

```json
{
  "type": "document",
  "astVersion": "2.0",
  "extensions": [{ "name": "carve.annotation", "version": "1", "required": false, "slots": [] }],
  "children": [
    {
      "type": "paragraph",
      "data": { "carve.annotation": { "ids": ["comment-12"] } },
      "children": ["..."]
    }
  ]
}
```

The paragraph's children are elided here. A reader checks this namespace in two steps:

- With the tree alone, it checks the shape of each value and refuses an id that occurs twice, in one value or across the tree.
- With the sidecar as well, it checks that each listed id names a range whose start or end path is that node or a node inside it. An id with no range is refused.

Parsing Carve source never produces this namespace. The HTML renderer and the Carve writer ignore it, and the writer reports no loss for it, because data is not content. Tree equality does compare it.

## Ids and kinds belong to the host

`id` is the host's own name for the annotation. It is not `attrs.id`, which the author wrote and which renders as an HTML anchor. A review comment keeps its id in the host's store; the sidecar says where that id currently points.

The 0.2 sidecar has no `kind` field. A host that distinguishes comments, search hits, and cursors puts that in `data` under its own declared namespace, for example `{"org.example.review": {"kind": "comment"}}`. A reader keeps unknown optional `data` on a range and refuses an undeclared key.

## Edits and writing

A path moves when a sibling is inserted before it. A tree round trip through `encodeTree` and `decodeTree` keeps every path and byte offset, but an edit does not: after an edit the host rebinds each range against the new tree. The 0.2 contract does not define how. A range that can no longer be placed is the host's to drop or to flag.

Carve source has no spelling for a range, and the writer ignores `carve.annotation`, so ranges do not survive a canonical write. The ids and payloads are the host's and outlive the write; the addressing does not.

## What a reader refuses

`validateTree` and `decodeTree` with a sidecar refuse, with a `CarveTreeError` whose path points into the sidecar or the tree:

- a sidecar that is not an object with `ranges`, including a 0.1 record with `version`;
- a range with a field other than `id`, `start`, `end`, and `data`, such as a 0.1 `kind`;
- two ranges with one `id`;
- a `path` that names no node of the tree;
- an `offset` past the end of the node's annotation text, or inside the bytes of one character;
- a `data` key not declared on the root or envelope.

## Changed since 0.1

- Offsets count UTF-8 bytes of the annotation text instead of code points.
- The sidecar has no `version`, and a range has no `kind`; host vocabularies go in declared `data`.
- The `carve.annotation` data namespace is new: it lets a node list the ranges that touch it.
- The projection reads `value`, `alt`, and `smart_punctuation.source`. The 0.1 `content` and `text` fields no longer exist; raw nodes and comments hold their text in `value`.

**Specification (external):** [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [extension nodes, foreign data and resources](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources), [standard data namespaces](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#standard-data-namespaces), [tooling: library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library), [`annotation-ranges.schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/annotation-ranges.schema.json), [`carve-annotation.schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/schemas/carve-annotation.schema.json).
