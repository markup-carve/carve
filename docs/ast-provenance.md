---
description: Record a local foreign locator in the 0.2 tree.
---

# Provenance in parsed document JSON

A host that assembles documents from several inputs, or imports them from other formats, often needs to say where a node came from: which file an included paragraph was read from, which Word paragraph an imported block maps to, which importer produced it.

Carve 0.1 answered this with a **provenance sidecar**: a separate record with a graph of source inputs, byte spans per node, and an authored or generated flag. **Carve 0.2 has no provenance sidecar.** Its two replacements are narrower and live in the tree itself:

- `pos.file` on nodes that came from an included Carve file, with the include nodes that read them still in the tree; and
- the `carve.source` data namespace, which records a local locator for content imported from a foreign format.

Multi-source lineage graphs and byte spans into foreign inputs are outside the 0.2 contract.

## Included Carve files

When a parse expands includes, each `include` node stays in the tree and holds the blocks of the file it read. Every node from that file carries `pos.file`, the id of the file its coordinates are measured in. A node without `pos.file` comes from the top-level input.

A book that includes one chapter:

```crv
= Book

{{ chapter-one.crv }}
```

`chapter-one.crv` holds the heading `= Chapter One` and one paragraph. `carve ast --no-positions` with an include root gives this for the include:

```json
{"children":[{"children":[{"type":"text","value":"Chapter One"}],"generatedId":"Chapter-One","level":1,"type":"heading"},{"children":[{"type":"text","value":"Text of the chapter."}],"type":"paragraph"}],"file":"chapter-one.crv","path":"chapter-one.crv","type":"include"}
```

With positions, the include node and the included paragraph carry:

```json
{"endColumn":22,"endLine":3,"endOffset":29,"startColumn":1,"startLine":3,"startOffset":8}
{"endColumn":21,"endLine":3,"endOffset":35,"file":"chapter-one.crv","startColumn":1,"startLine":3,"startOffset":15}
```

The include node has no `pos.file`, because its directive stands in the top-level input. The paragraph has `"file": "chapter-one.crv"`, and its offsets 15 to 35 count bytes of that file.

Includes nest. If a chapter `ch2.crv` holds a paragraph and includes `parts/inner.crv`, the include of `parts/inner.crv` sits inside the include of `ch2.crv`:

```json
{"children":[{"children":[{"type":"text","value":"Intro text."}],"type":"paragraph"},{"children":[{"children":[{"type":"text","value":"Deep "},{"children":[{"type":"text","value":"text"}],"type":"emphasis"},{"type":"text","value":"."}],"type":"paragraph"}],"file":"parts/inner.crv","path":"parts/inner.crv","type":"include"}],"file":"ch2.crv","path":"ch2.crv","type":"include"}
```

The inner include node's own `pos` carries `"file": "ch2.crv"`, the file that holds its directive, and the paragraph inside it carries `"file": "parts/inner.crv"`.

What a host reads from this:

- **Where a node's bytes are.** `pos` offsets count UTF-8 bytes of the file `pos.file` names, not of an assembled document. There is no shared coordinate space, and positions in different files are never compared. To slice the source of a node, read the file its `pos.file` names.
- **The include chain.** The chain is the tree itself: walk up from a node to each enclosing `include`. The include's `path` is what the author wrote and `file` is the id the resolver returned; `file` and the expanded `children` are resolution results.
- **The files a document depends on.** `includeDependencies(tree)` lists them, and `carve ast --report-includes -` writes the same list as JSON. For the nested book, `from` names the including file:

```json
{
  "files": [
    {
      "file": "book.crv",
      "dependencies": [
        { "path": "ch2.crv", "read": true, "file": "ch2.crv" },
        { "path": "parts/inner.crv", "read": true, "from": "ch2.crv", "file": "parts/inner.crv" }
      ]
    }
  ]
}
```

- **Where a finding came from.** A diagnostic about included content carries `file`, and `includedBy`, the chain of include nodes from the top-level document inward, each with its `file` and `range`.

Without expansion (`--no-includes`, or a library parse with no resolver), the include node holds only `path` and its position, and no included node exists yet.

## Imported content: `carve.source`

An importer that reads another format can record, on any node, where in the foreign input that node came from. It uses the standard data namespace `carve.source`, declared on the root or envelope like any `data` key:

```json
{
  "type": "document",
  "astVersion": "2.0",
  "extensions": [{ "name": "carve.source", "version": "1", "required": false, "slots": [] }],
  "children": [
    {
      "type": "paragraph",
      "children": [{ "type": "text", "value": "Hello" }],
      "data": {
        "carve.source": {
          "format": "docx",
          "locator": { "part": "word/document.xml", "path": "/document/body/p[1]" },
          "importer": { "name": "pandoc-carve", "version": "2.0" }
        }
      }
    }
  ]
}
```

The value is closed and has three required parts:

| Field | Value |
| --- | --- |
| `format` | the foreign format, a nonempty string such as `docx` or `html` |
| `locator` | at least one of `part`, `path`, and `id`: the package part, an element path, or an element id inside the foreign input |
| `importer` | `name` and `version` of the tool that produced the node |

All strings are nonempty, and a reader refuses any other field, including 0.1 fields such as `startByte`. The 0.2 HTML importer declares the namespace and records the input on the root: `importDocument('<p>Hi</p>', { from: 'html' })` returns a tree whose root `data` holds `{"carve.source":{"format":"html","locator":{"part":"input"},"importer":{"name":"carve-import","version":"0.0.0"}}}`.

How the rest of the toolchain treats it:

- Parsing Carve source never produces `carve.source`.
- The HTML renderer ignores it, and the Carve writer ignores it without reporting a loss, because data is not content. A canonical write therefore drops it.
- Tree equality compares it, so the same paragraph with and without a locator gives two unequal trees.
- A reader refuses the namespace when it is not declared, and refuses a node-shaped object anywhere inside it.

## What has no 0.2 counterpart

| 0.1 provenance sidecar | 0.2 |
| --- | --- |
| `sources` list with ids and URIs | none; a resolver returns file ids, and the tree holds them as `include.file` and `pos.file` |
| `parent` link between sources | the nesting of `include` nodes in the tree |
| `startByte` and `endByte` per node | `pos` offsets in UTF-8 bytes of the file named by `pos.file`, for Carve inputs only |
| `format` of a non-Carve input | `carve.source.format` |
| `origin`: `authored` or `generated` | none |
| `step`, a pipeline stage id | none; a pipeline can declare its own `data` namespace |
| `parseWithProvenance` | none |

A host that needs a lineage graph across several foreign inputs keeps it outside the tree, or in its own declared `data` namespace, and should not present it as a Carve interchange format.

**Specification (external):** [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [positions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#positions), [standard data namespaces](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#standard-data-namespaces), [further clauses: the include node](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#further-clauses), [includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), [tooling: diagnostics and reports](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#diagnostics-and-reports), [`carve-source.schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/schemas/carve-source.schema.json), [upgrade guide: JavaScript API](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#javascript-api).
