---
description: The versioned semantic tree of Carve 0.2 and the records that accompany it.
---

# Parsed document JSON

A parser represents a Carve document as an **abstract syntax tree (AST)**: a tree of objects for headings, paragraphs, links, and other content. Use this JSON when an editor, linter, converter, or service needs document structure, references, or source positions rather than rendered HTML.

Carve 0.2 publishes AST contract 2.0. Most applications need only the common shape on this page. Parser, binding, and editor authors can read the [complete AST contract](/ast-json-contract).

## Start with a small document

The Carve source:

```crv
Hello *world*.
```

has a document root containing a paragraph and its inline children. This is `carve ast --no-positions`, pretty-printed:

```json
{
  "astVersion": "2.0",
  "children": [
    {
      "children": [
        {
          "type": "text",
          "value": "Hello "
        },
        {
          "children": [
            {
              "type": "text",
              "value": "world"
            }
          ],
          "type": "strong"
        },
        {
          "type": "text",
          "value": "."
        }
      ],
      "type": "paragraph"
    }
  ],
  "srcByteLength": 15,
  "stages": [
    "includeExpansion",
    "referenceResolution",
    "tableAlignment"
  ],
  "type": "document"
}
```

The root always carries `type: "document"`, `astVersion`, and `children`. `srcByteLength` counts the UTF-8 bytes of the parsed source, and `stages` names the resolution stages that ran. The members of every object come out sorted by name, because `encodeTree` writes the JSON Canonicalization Scheme (RFC 8785). Readers must not depend on member order.

## Get a tree

The reference engine installs the command as `carve`. `carve ast` writes a bare tree with positions by default. Add `--no-positions` to drop `pos`, and `--envelope` when the tree crosses a storage or process boundary:

```sh
carve ast document.crv
carve ast --no-positions document.crv
carve ast --envelope document.crv
```

In JavaScript, `parse` returns the resolved tree, and `encodeTree` or `encodeEnvelope` turn it into JSON text:

```js
import { parse, encodeTree, decodeTree } from '@markup-carve/carve'

const tree = parse(source)
const json = encodeTree(tree)
const again = decodeTree(json) // runs the schema and every reader check
```

`parseWithDiagnostics` also returns the parse and resolution findings, and `parseWithLayout` also returns the [source-layout sidecar](/ast-source-layout). Other engines offer the same calls, spelled by the conventions of their language.

## Fields you will use most

| Field | Meaning |
| --- | --- |
| `type` | The node type, such as `paragraph`, `heading`, `link`, or `text` |
| `children` | The primary content slot of a node that holds other nodes |
| `value` | The literal text of `text`, `code`, `code_block`, `math`, comments, raw nodes, and `frontmatter` |
| `attrs` | Attributes the author wrote: `id`, `classes`, and ordered `keyValues` |
| `pos` | The source range of a node parsed from Carve source |
| `caption`, `title` | Named slots that also hold nodes; see the walker below |

Consumers dispatch on `type` and read only the fields that type defines. Nodes are closed: a reader refuses a field the schema does not name, so do not attach your own fields to a node. Put application data under a declared `data` namespace instead (see the [complete contract](/ast-json-contract#extensions-data-and-the-envelope)).

## Walk the tree

`children` is not the only place nodes live. A caption, a code block title, a citation locator, ruby pairs, and extension slots are named slots, and a walker that only follows `children` misses them. The specification lists every slot of every node type, in walk order, in the generated file `spec/0.2/data/node-slots.json`. Read that file instead of writing the list by hand:

```js
import { readFileSync } from 'node:fs'

const slots = JSON.parse(readFileSync('node-slots.json', 'utf8')).nodes

function* reach(value, steps) {
  if (value == null) return
  if (steps.length === 0) {
    yield* Array.isArray(value) ? value : [value]
    return
  }
  const [step, ...rest] = steps
  for (const item of step === '*' ? Object.values(value) : [value[step]]) yield* reach(item, rest)
}

function visit(node, onNode) {
  onNode(node)
  for (const slot of slots[node.type] ?? []) {
    for (const child of reach(node, slot.split('.'))) visit(child, onNode)
  }
}
```

For this source, the walker finds the link inside the caption, which a `children`-only walk skips:

```crv
![A chart](chart.png)
^ See [notes](/notes)
```

Text and other leaf nodes have no `children`. Do not infer a node's meaning from its HTML output either, since different trees can render the same bytes. Never search opaque `data` or extension `props` for nodes: the walker does not, and a reader refuses a node-shaped object found there.

## Attributes and identifiers

Authored ids, classes, and key-value attributes appear in `attrs`. `keyValues` is a list of `[key, value]` pairs in written order, and a bare key has the empty string as its value. Resolution results never go into `attrs`. A generated heading id is the heading field `generatedId`:

```crv
= Getting started

{#intro .lead data-n=1 hidden}
Read this first.
```

```json
{"children":[{"type":"text","value":"Getting started"}],"generatedId":"Getting-started","level":1,"type":"heading"}
{"attrs":{"classes":["lead"],"id":"intro","keyValues":[["data-n","1"],["hidden",""]]},"children":[{"type":"text","value":"Read this first."}],"type":"paragraph"}
```

A tool that needs the id the HTML will carry reads `attrs.id` first and falls back to `generatedId`. The default `headingIds` setting is `keep-case`, which is why the generated id keeps its capitals.

## Links and references

A direct link keeps its destination in `href`; an image uses `src`. A reference use carries `key` (the folded label), `namespace`, and `refForm` (`full`, `collapsed`, or `shortcut`). Resolution adds the destination beside them. An unresolved reference is still a `link` or `image` node, with no `href` or `src`:

<!-- carve-sample {"lint":"shows an unresolved reference on purpose"} -->
```crv
See [missing][] and [the guide][guide].

[guide]: /guide
```

```json
{"children":[{"type":"text","value":"missing"}],"key":"missing","namespace":"link","refForm":"collapsed","type":"link"}
{"children":[{"type":"text","value":"the guide"}],"href":"/guide","key":"guide","namespace":"link","refForm":"full","type":"link"}
{"href":"/guide","key":"guide","namespace":"link","type":"link_reference_definition"}
```

An application that only needs the destination reads `href` or `src`. The definition itself is a `link_reference_definition` node at its place among the document's children. The reference as the author typed it, brackets included, is not in the tree; it is the `rawRef` fact of the source-layout sidecar. To write Carve back, use the canonical writer rather than rebuilding reference syntax from the destination.

Destinations hold exactly what the author wrote. The tree may contain `javascript:alert(1)`; the renderer blanks a denied scheme, but a consumer that builds its own output from the tree must apply the URL policy itself.

## Source positions

Parsed nodes carry `pos` with six integers. Lines and columns start at 1 and columns count Unicode code points. Offsets start at 0 and count UTF-8 bytes of the original input. Ends are exclusive. In this source `é` takes two bytes, so after it every offset runs one ahead of the column count. The text `ok` starts at column 7 and at offset 7, where plain ASCII text would put it at offset 6:

```crv
Café *ok*
```

```json
{"pos":{"endColumn":6,"endLine":1,"endOffset":6,"startColumn":1,"startLine":1,"startOffset":0},"type":"text","value":"Café "}
{"children":[{"pos":{"endColumn":9,"endLine":1,"endOffset":9,"startColumn":7,"startLine":1,"startOffset":7},"type":"text","value":"ok"}],"pos":{"endColumn":10,"endLine":1,"endOffset":10,"startColumn":6,"startLine":1,"startOffset":6},"type":"strong"}
```

Imported or programmatically built nodes have no position. A parsed node whose value is not one contiguous slice of the source, such as a table cell joined from a continuation row, also omits `pos`; a producer never invents a range. An editor that works in JavaScript string indices must convert byte offsets explicitly. The engine exports `positionOf`, `utf8Length`, and `stringOffsetOfByte` for that.

The [complete contract](/ast-json-contract#source-positions) gives the full span rules.

## Editing safely

Validate a tree from outside before rendering or writing it. `decodeTree` reads JSON text and `validateTree` checks a tree you already hold. Both run the schema plus the reader checks the schema cannot express, and refuse with `CarveTreeError` naming the JSON path that failed.

For structural edits, `diffTree` and `applyPatch` exchange RFC 6902 JSON Patch over the encoded tree. Pass `treeFingerprint(tree)` as the `fingerprint` option to refuse a patch made against another version of the tree. See [Source-preserving patches](/source-patches) for how this relates to editing source text.

After changing a tree:

1. validate it with `validateTree`;
2. write it with `write` or `writeWithDiagnostics`, the canonical Carve writer;
3. parse the written source again if the change crosses a storage or interoperability boundary; and
4. surface every reported loss instead of discarding it. `write` throws `CarveWriteError` where it would lose something; `writeWithDiagnostics` returns the source and the losses.

A path into the tree moves when a sibling is inserted before it, so anything that has to survive an edit needs more than a pointer. 0.2 specifies two records beside the tree:

- the [source-layout sidecar](/ast-source-layout), which keeps author spelling and byte ranges, and
- [annotation ranges](/ast-annotation-ranges), which mark text spans that do not nest inside the inline tree.

[Node identity](/ast-node-identity) and [provenance](/ast-provenance) have no 0.2 sidecar; their pages explain what replaced them.

## Older trees

A 2.0 reader refuses AST 1.x trees. Convert them with `migrateTree` or `carve migrate-ast` instead of changing `astVersion` by hand: the node types and fields differ throughout. The [complete contract](/ast-json-contract#migrating-older-trees) lists the main changes.

## Schema and complete contract

The 0.2 tree schema is published at `https://markup-carve.github.io/carve/spec/0.2/data/ast-schema.json`, beside the layout schema at `spec/0.2/data/layout-schema.json`. The 0.1 schema stays at `https://markup-carve.github.io/carve/ast-schema.json`, with the other 0.1 schemas at the site root, so tools that validate 0.1 trees keep working. Those files describe AST 1.x, not 2.0.

The [complete AST contract](/ast-json-contract) covers every rule an implementation needs: the envelope and versions, each node family, positions, equality, reader refusals, shapes Carve source cannot spell, and migration.

**Specification (external):** [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [root, envelope and versions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#root-envelope-and-versions), [node grammar](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#node-grammar), [attributes](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#attributes), [references](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#references), [positions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#positions), [reading a tree](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#reading-a-tree), [tooling: library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library), [`ast-schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/ast-schema.json), [`node-slots.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/node-slots.json).
