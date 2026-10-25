---
title: Annotation Ranges in Parsed Document JSON
description: Optional overlapping ranges for review comments, search hits and collaborative presence.
---

# Annotation ranges in parsed document JSON

Carve represents inline formatting as nested nodes, which is the right model for
a document and the wrong one for a range that does not nest: a review comment
spanning the tail of one emphasis and the head of the next, a search hit crossing
a link boundary, a collaborative cursor.

An editor can request a second JSON object holding those ranges. The API calls it
an **annotation range sidecar**. The machine-readable contract is
[`ast-annotation-range-schema.json`](https://markup-carve.github.io/carve/ast-annotation-range-schema.json),
and PART 12 §40 governs it. The
[parsed document JSON](./ast-json.md) does not change.

```json
{
  "version": 2,
  "ranges": [
    {
      "id": "comment-12",
      "kind": "comment",
      "start": { "path": "/children/3", "offset": 4 },
      "end": { "path": "/children/4", "offset": 12 },
      "payload": { "author": "Ada", "date": "2026-10-25", "resolved": false, "replies": [] }
    }
  ]
}
```

## An anchor is a pointer and an offset

`path` is an RFC 6901 pointer into the accompanying canonical AST, the same
addressing [node identity](./ast-node-identity.md) uses. `offset` counts UTF-8 bytes in the addressed node's annotation text, from zero
through its byte length. PART 12 §40 defines that projection independently of JSON
member order. It counts a literal string `value`, or an image `alt` when no
literal value exists, then child projections in the specified field order. Breaks contribute a
newline and `non_breaking_space` contributes U+00A0. Attributes, URLs and opaque extension
payloads contribute nothing; no separators are invented between blocks.

For a paragraph containing `A😀`, an image with alt text `cat`, a hard break,
and math `x^2`, the projection is `A😀cat\nx^2`, with 12 UTF-8 bytes. Its end
offset is 12. Readers reject
larger offsets and paths that do not address nodes.

`start` and `end` may address different nodes, which is how a range crosses a
boundary the tree does not let it nest inside. Two ranges may cross each other
freely; nothing is re-bracketed to make either nest. A range whose two anchors
are equal is an empty point, which is what a cursor is.

## Kinds are the host's, not Carve's

Core defines `comment`, `revision`, `bookmark`, `index_range`, and `mark` with
typed `payload` objects. Other kinds use a globally qualified name and may
carry opaque `data`.

`data` is the holder's extension payload. Core does not interpret it.

## An anchor lives for one tree

A pointer moves when a sibling is inserted before it. After an edit the producer
re-emits the whole sidecar against the new tree; a range it can no longer place
has no entry, and that absence is how a consumer learns its anchor is gone. There
is no tombstone. A consumer never carries a path across an edit.

`id` is the holder's own id for the annotation - not `attrs.id`, which is the
author's, and not a node identity id, which is the producer's. A review comment
keeps its id in the holder's store; what the sidecar supplies is where that id
currently points.

## Anchors do not survive a canonical write

Carve source has no spelling for a range, so a canonical write drops the anchors.
The ids and payloads are the holder's and outlive the write; the addressing does
not.

Default parsing, AST JSON, CLI JSON and rendering do not change. Two documents
differing only in sidecar content are the same document under PART 12 §6. An AST
decoder does not accept a sidecar as an AST, and a range reader rejects a version
it does not implement.

Raw-node and comment strings contribute their literal `value`. Smart punctuation's `source` is spelling, so it contributes no text. The projection defines AST offsets, rather than rendered-text offsets.
