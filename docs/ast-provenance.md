---
title: Provenance in Parsed Document JSON
description: Optional per-node provenance for included, imported and generated content.
---

# Provenance in parsed document JSON

`pos.file` names the file an included node came from. That is one identifier and
no more: it cannot say what format the content arrived in, where in that file the
bytes were, which include pulled it in, or whether a person wrote the node at all.

A caller can request a second JSON object carrying those facts. The API calls it a
**provenance sidecar**. The machine-readable contract is
[`ast-provenance-schema.json`](https://markup-carve.github.io/carve/ast-provenance-schema.json),
and PART 12 §41 governs it. The
[parsed document JSON](./ast-json.md) does not change.

```json
{
  "version": 1,
  "sources": [
    { "id": "s0", "uri": "file:///book/index.crv" },
    { "id": "s1", "uri": "file:///book/ch1.md", "format": "markdown", "parent": "s0" }
  ],
  "nodes": [
    { "path": "/children/3", "source": "s1", "startByte": 40, "endByte": 68,
      "origin": "authored", "step": "md-import-1" }
  ]
}
```

## Inputs are named once

`sources` records each input the document was assembled from. `nodes` points at
one of them by `id` rather than repeating its URI, and a node's byte range
addresses that input, not the assembled document.

`format` says what the content arrived as where it was not Carve. Absent means
unrecorded, never a guessed `carve` - the same reading
[source layout](./ast-source-layout.md) takes for a fact nobody measured.

## Ancestry is on the source

`parent` is the id of the source that included or imported this one, so a nested
include traces to its root by walking the chain. It is recorded once per input
instead of copied onto every node that came from it, and a root input has no
`parent`. An include cycle is already refused when the document is assembled.

## Bytes, not offsets

`startByte` and `endByte` count bytes of the input they name, start-inclusive and
end-exclusive. They are deliberately not called offsets: `pos` on the node counts
codepoints. With `pos.file`, those coordinates address the named input file;
without it, they address the top-level input. There is no implicit assembled
coordinate space. Converting to bytes requires the text of that same input.
Parent/child containment checks compare only positions from the same input.

## Authored or generated

`origin` is `authored` where a person wrote the node and `generated` where the
processor produced it - a table of contents, a numbered caption, an endnotes
section a bridge derived. `step` is an opaque id for the transformation that
produced the node, for a pipeline that wants to name its own stages. Nothing in
Carve reads it.

## This is where a filesystem path may appear

`pos.file` stays the inline minimum. Everything else about where a byte came from
lives here, which means a caller that never asks for the sidecar never receives a
path.

A canonical write produces a new input, so the sidecar does not travel with it:
every byte range in it would then address text nothing emitted.

Default parsing, AST JSON, CLI JSON and rendering do not change. Two documents
differing only in sidecar content are the same document under PART 12 §6. An AST
decoder does not accept a sidecar as an AST, and a provenance reader rejects a
version it does not implement.
