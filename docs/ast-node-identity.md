---
title: Node Identity in Parsed Document JSON
description: Optional ephemeral node ids for editors and collaborative integrations.
---

# Node identity in parsed document JSON

An RFC 6901 pointer into the [parsed document JSON](./ast-json.md) addresses a
node in one tree. It stops addressing the same node the moment a sibling is
inserted before it, which is enough for a transactional patch and not enough for
anything that has to survive an edit: a comment anchored to a paragraph, a
collaborative cursor, an incremental reparse asking which nodes are the same
nodes.

An editor can request a second JSON object binding an ephemeral id to each node.
The API calls this object a **node identity sidecar**. The machine-readable
contract is
[`ast-node-identity-schema.json`](https://markup-carve.github.io/carve/ast-node-identity-schema.json),
and PART 12 §38 governs it.

```json
{
  "version": 1,
  "session": "s-7f3",
  "nodes": [{ "id": "n4", "path": "/children/3" }]
}
```

## These are not the author's ids

`attrs.id` is what the author wrote in `{#intro}`. It belongs to the document,
it survives a canonical write, and a renderer puts it in the HTML. An identity
id belongs to the session: nothing derives one from the other in either
direction.

## The path is the binding, not the identity

The `id` is what a consumer holds on to. The `path` says where that id sits in
the tree this sidecar came with, and nowhere else.

After an edit the producer re-emits the whole sidecar. A node it still
recognizes keeps its `id` and gets whatever path it now has. A node it no longer
recognizes has no entry, and that absence is how a consumer learns its anchor is
gone - there is no tombstone to read. Within one `session` an id is never handed
to a different node, so an id a consumer still finds is the node it anchored to.

A consumer therefore re-reads the sidecar after every edit and never carries a
path across one.

## Ids are session-scoped

Carve source has no spelling for these ids, so a canonical write drops them and
a re-parse mints new ones. `session` is the opaque token that makes that
checkable: two sidecars whose `session` values differ share no ids, whatever
their strings look like.

## What the sidecar does not carry

No spans. A node's offsets are the `pos` field on the node its path addresses,
counted in codepoints (PART 12 §4). A second copy in the sidecar could disagree
with the first.

No filesystem paths. `pos.file` remains the inline minimum, per PART 12 §13.

Default parsing, AST JSON, CLI JSON and rendering do not change. Two documents
differing only in sidecar content are the same document under PART 12 §6. An AST
decoder does not accept a sidecar as an AST, and an identity reader rejects a
version it does not implement.
