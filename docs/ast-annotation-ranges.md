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
  "version": 1,
  "ranges": [
    {
      "id": "comment-12",
      "kind": "comment",
      "start": { "path": "/children/3", "offset": 4 },
      "end": { "path": "/children/4", "offset": 9 },
      "data": {}
    }
  ]
}
```

## An anchor is a pointer and an offset

`path` is an RFC 6901 pointer into the accompanying canonical AST, the same
addressing [node identity](./ast-node-identity.md) uses. `offset` counts codepoints in the addressed node's annotation text, from zero
through its length. PART 12 §40 defines that projection independently of JSON
member order. It counts the first string among `value`, `content`, `text`, and
`alt`, then child projections in the specified field order. Breaks contribute a
newline and `non_breaking_space` contributes U+00A0. Attributes, URLs and opaque
payloads contribute nothing; no separators are invented between blocks.

For a paragraph containing `A😀`, an image with alt text `cat`, a hard break,
and math `x^2`, the projection is `A😀cat\nx^2`, with nine codepoints. Its end
offset is 9, regardless of the emoji's two UTF-16 code units. Readers reject
larger offsets and paths that do not address nodes.

`start` and `end` may address different nodes, which is how a range crosses a
boundary the tree does not let it nest inside. Two ranges may cross each other
freely; nothing is re-bracketed to make either nest. A range whose two anchors
are equal is an empty point, which is what a cursor is.

## Kinds are the host's, not Carve's

`kind` is an open vocabulary matched by string equality, and core defines no
member of it. A closed list would name kinds no clause in the language renders,
which is a promise nothing keeps. A kind core did not define is globally
qualified the way an extension name is, so two hosts cannot collide on one word.

`data` is the holder's payload. Nothing in Carve reads it.

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

Raw-node and comment strings contribute their literal `content`. Smart punctuation contributes its source `value`, not its rendered glyph. The projection defines AST offsets, rather than rendered-text offsets.
