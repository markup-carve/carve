---
description: Which parts of the Carve 0.2 tree contract an integration task needs.
---

# Parsed document JSON contract

This page is the interchange contract for parser, binding, converter, and editor implementers, written as a guide to the AST 2.0 rules of Carve 0.2. For traversal, common fields, and everyday use, start with [Parsed document JSON](/ast-json).

> [!TIP]
> Most application developers need only the shape in one document, the rules under it, and the sections on producing and validating trees. The node families further down are for parser, binding, and editor developers.

A parser represents a Carve document as an **abstract syntax tree (AST)**: a tree of objects for headings, paragraphs, links, and other content. This page describes its JSON form, so one implementation can write a tree and another can read it. The machine-readable form is the JSON Schema `ast-schema.json`; the specification chapter and the schema define the same contract, version 2.0. The 0.1 contract (AST 1.x) does not describe a 2.0 tree.

## Why it exists

Editors, linters, converters, and document comparison tools need structured content, not finished HTML. A shared JSON format prevents each implementation from giving the same information different field names. In 0.2 the contract also draws a firm line between meaning and spelling: the tree holds a fact only when it changes rendered output or a later resolution. How the author spelled it goes into the [source-layout sidecar](/ast-source-layout).

## Reading the round-trip requirements

A JSON round trip, a source round trip, and an HTML comparison answer different questions.

| Operation | What is preserved |
| --- | --- |
| Encode a parsed tree with `encodeTree` and read it back with `decodeTree` | Every field, positions included. An encoder that drops a field is not conformant. |
| Format Carve source with `carve fmt` and parse the result | The tree, under tree equality. The formatter is also idempotent: formatting its own output changes nothing. |
| Write a supplied or edited tree with `write` | Whatever Carve source can spell. The writer invents no syntax for the rest and reports each loss with its JSON path. |
| Compare rendered HTML | Only the rendering. Matching HTML does not mean equal trees: different trees can render the same bytes. |

Tree equality compares node types, fields, child order, `attrs`, typed `metadata`, and opaque `data` after joining adjacent text. It skips `pos`, `segments`, `srcByteLength`, and the resolution fields listed in `ast-results.json`. The engine exports it as `treesEqual`.

Representability depends on the shape and its values, not only on the node type. A code block whose `value` is `"a"` survives JSON unchanged, but a closed Carve fence always ends its payload with a line break, so writing it reports `field-unspellable` for `/children/0/value`. A `caption.short` survives JSON and is dropped by the writer. The sections below give each case.

## Editing APIs

Every engine offers `diffTree` and `applyPatch`, which exchange RFC 6902 JSON Patch over the encoded tree, and `treeFingerprint`, which `applyPatch` takes as a stale-edit guard. There is no reversible patch and no three-way merge. Validate operation names, values, and pointer paths from untrusted callers; `applyPatch` refuses a bad patch with `CarvePatchError` and applies nothing. [Source-preserving patches](/source-patches) covers the details.

Engine-specific editor APIs are outside the contract. The JavaScript reference engine's `createEditorSession` is described under [node identity](/ast-node-identity).

## The shape in one document

`carve ast` for `Hello *world*.`, with one `pos` per line:

```json
{
  "astVersion": "2.0",
  "children": [
    {
      "children": [
        {
          "pos": {"endColumn": 7, "endLine": 1, "endOffset": 6, "startColumn": 1, "startLine": 1, "startOffset": 0},
          "type": "text",
          "value": "Hello "
        },
        {
          "children": [
            {
              "pos": {"endColumn": 13, "endLine": 1, "endOffset": 12, "startColumn": 8, "startLine": 1, "startOffset": 7},
              "type": "text",
              "value": "world"
            }
          ],
          "pos": {"endColumn": 14, "endLine": 1, "endOffset": 13, "startColumn": 7, "startLine": 1, "startOffset": 6},
          "type": "strong"
        },
        {
          "pos": {"endColumn": 15, "endLine": 1, "endOffset": 14, "startColumn": 14, "startLine": 1, "startOffset": 13},
          "type": "text",
          "value": "."
        }
      ],
      "pos": {"endColumn": 15, "endLine": 1, "endOffset": 14, "startColumn": 1, "startLine": 1, "startOffset": 0},
      "type": "paragraph"
    }
  ],
  "srcByteLength": 15,
  "stages": ["includeExpansion", "referenceResolution", "tableAlignment"],
  "type": "document"
}
```

The rules that carry most of the weight follow.

**The root.** The root is a `document` with `astVersion` and block `children`. It may also carry `srcByteLength`, `extensions`, `stages`, `resources`, and the common node fields; nothing else. `astVersion` has the form `2.MINOR`, and a 2.0 producer writes `"2.0"`. Frontmatter and definitions are nodes among the `children`, not root fields, because a root field cannot carry a position and both are source an editor navigates to.

**Field names are spec surface.** `href`, `src`, `value`, `level`, `children`, and every other name come from the contract. An implementation whose internal tree differs maps it on output. It does not export its internal shape, does not invent a synonym, and does not publish a field the contract does not name. Nodes are closed: a reader refuses any field the schema does not name.

**Node types.** There are 75 node types, all `snake_case`, from `abbreviation` to `xref`. A tree with any other core `type` is refused. Container-only types such as `list_item`, `table_row`, `table_cell`, `cell_paragraph`, `caption`, `citation`, `ruby_pair`, `line`, and `table_column` are refused outside their container.

**Meaning stays, spelling moves out.** A list carries a `marker` object: `{"kind": "bullet", "char": "-"}` or `"*"`, or for an ordered list `kind: "ordered"` with `style` (`1`, `a`, `A`, `i`, `I`), `delimiter` (`.` or `)`), and `start` when it is not 1. The bullet character is meaning, because `-` and `*` lists are two lists. Whether an ordered list used written numbers or bare dots is spelling and is in the sidecar. A `thematic_break` has no fields, since 0.2 has one spelling. A heading's marker, a fence's character and length, and the width of a table separator are not recorded anywhere.

**The tree is pre-resolve, with results beside it.** The tree records what the author wrote. Resolution adds results next to the authored construct and never replaces it: a reference keeps `key`, `namespace`, and `refForm`, and gains `href` once resolved. `ast-results.json` lists every result field per type: `generatedId`, `number`, resolved `href` and `src`, `resolvedAlign`, derived span counts, `stages`, and the expanded `children` and `file` of an include. A renderer runs resolution on every tree it is given and overwrites every result field except those of an expanded include, so it never trusts a supplied result.

## References and links

A reference use and its definition carry `key` and `namespace` together. The namespaces are `link`, `footnote`, `citation`, `abbr`, and `heading`. A direct link or image carries neither. A reference `link` or `image` also carries `refForm` (`full`, `collapsed`, or `shortcut`) exactly when it carries `key`.

`key` is the folded label: every run of spaces, tabs, and line breaks becomes one space, the ends are trimmed, and case is kept. Uses and definitions fold the same way, so two keys match when they are equal strings. The label keeps its markup characters, which differs from 0.1:

```crv
= `code()` heading

See [`code()`   heading][].
```

```json
{"children":[{"type":"code","value":"code()"},{"type":"text","value":"   heading"}],"href":"#code-heading","key":"`code()` heading","namespace":"link","refForm":"collapsed","type":"link"}
```

The key is `` `code()` heading ``, with its backticks and with the three spaces folded to one. The link resolved against the heading, so `href` holds the heading's slug. A link reference looks in the link definitions first, then in the headings; images and footnotes do not look in the headings. The reference as typed, brackets included, is the `rawRef` fact of the source-layout sidecar; the 0.1 tree field `rawRef` is gone.

On a reference use, an absent `href` or `src` means unresolved, and the empty string means a definition with an empty destination. There is no `resolved` field. An unresolved full or collapsed reference stays a `link` or `image` with its `children` or `alt`, `key`, `refForm`, and `attrs`, and HTML renders its brackets and label as text. A shortcut reference forms only for a defined key, so a parsed one is never unresolved.

A trailing attribute block on a reference is ordinary `attrs`. The merge with the attributes of its definition is a resolution result: it is not written into `attrs` and takes no part in equality.

**A nested link and an autolink stay nodes.** "Links never nest" is a rendering rule. A `link` or `autolink` inside a link's text is published as the node the author wrote, and every renderer unwraps it:

```crv
[outer <https://example.com> text](/a)
```

```json
{"children":[{"type":"text","value":"outer "},{"href":"https://example.com","type":"autolink"},{"type":"text","value":" text"}],"href":"/a","type":"link"}
```

```html
<p><a href="/a">outer https://example.com text</a></p>
```

A consumer walking a link's `children` must expect a `link` or `autolink` there and must not emit a nested anchor for it. An `autolink` carries `text` only where the visible text differs from `href`, as for `<a@b.org>`, whose `href` is `mailto:a@b.org`.

Definitions are nodes with a position: `link_reference_definition`, `footnote`, `abbreviation_def`, `citation_definition`, and `snippet_definition`. They stand only among the top-level children of a document or an expanded include, at their place in source order, and the first of two definitions with one key wins.

## Source positions

Every node of a tree a parser built from source carries `pos`, except the root and the nodes listed below. `pos` has six required integers:

| Field | Counts | Starts at |
| --- | --- | --- |
| `startLine`, `endLine` | lines | 1 |
| `startColumn`, `endColumn` | Unicode code points on the line | 1 |
| `startOffset`, `endOffset` | UTF-8 bytes of the original input | 0 |

Ends are exclusive. `pos.file`, when present, is the id of the included file the coordinates are measured in; absence means the top-level input, and positions in different files are never compared. `pos` is never `null`. Byte offsets differ from 0.1, which counted code points.

**Where a span starts.** At the markup that opens the construct: the quote mark, the heading marker, the list marker, the colon run of a div, the opening bracket of a link, the backtick run of a fence. Leading indent on the opening line is outside the span, for a container as for a leaf: in a line ` > a` (one space, then the quote) the quote starts at its mark, offset 1. A block that took attribute lines starts at the first of them. A table cell is the one exception: it spans the text between its pipes. No span starts at a line ending, except a break's.

**Where a span ends.** Directly after the last source character the construct owns. A closing delimiter and an attached attribute block are inside; a following line ending, a blank line, and an attribute line that attached to nothing are outside. Spaces and tabs at the end of a line always have an owner. At the end of a block's last line they belong to the block. Inside a paragraph they belong to the node that drops them: a line comment owns the spaces before its `%%`, and otherwise the following break owns them. For `a %% x`, two trailing spaces, a line feed, and `b`, the paragraph spans offsets 0 to 10, the comment 1 to 8, and the soft break 8 to 9.

**Breaks.** A break owns its line ending, so it ends at column 1 of the next line. A hard break also spans its backslash. Two breaks that meet at one line ending share it.

**Containers.** A container, a list, a description list, and a table end after their closer when they have one, and otherwise after their last positioned child. A block with a caption ends where its caption ends. A container with no positioned child spans its own opening markup and is never zero-width.

**Parents and siblings.** A child lies inside its parent, and siblings are ordered and disjoint. Nodes without `pos` are skipped, and their children are compared with the nearest positioned ancestor. A few comment placements are exempt, all named in the specification.

**Nodes that omit `pos`.** A parser omits `pos` only for a node with no source character or one whose value is not a single contiguous slice of the source:

- no source character: `table_column`, the `cell_paragraph` of an empty cell, and an empty `line` of a line block;
- not one slice: a row, cell, and cell paragraph joined from a continuation row, an inline node that takes characters from more than one piece, a `text` node merged from pieces that are not adjacent, the rows and cells of a delimited table, and the copy of a caption that a code include gives its child.

Such a node may carry `segments`, a list of ranges in the shape of `pos`, one per source piece. A span over the first piece only, or from the first piece to the last, is not an acceptable `pos`. Imported and built trees have no positions at all, and the types `section`, `ruby`, `ruby_pair`, and `small_caps`, which have no source spelling, are never positioned. A node a producer has merely not placed yet is a defect.

**A worked case.** For a caption with a number mark, each piece has its own span:

```crv
![i](a.png)
^ Figure #: cap
```

The text `Figure ` spans offsets 14 to 21, the `caption_number` spans its `#` at 21 to 22, and the text `: cap` spans 22 to 27.

The 0.1 rules about hoisted definitions are gone. In 0.1 a definition written inside a container was collected and moved to the document, so its span overlapped the container. In 0.2 a definition is recognized only at column 0 outside every container; the same line inside a list item is paragraph text:

<!-- carve-sample {"lint":"shows the definition-in-container finding"} -->
```crv
- a

  [r]: /u
```

## Block images and math blocks

A paragraph that holds one image, and only comment lines beside it, is a block image with `role: "image"`. A paragraph that holds one display math node the same way is a math block with `role: "math"`. The parser sets the role when the paragraph closes; an ordinary paragraph omits it. `role` is a tree fact that equality compares, and it replaces the 0.1 fields `blockImage` and `blockMath`. A reader refuses `role` on a paragraph of another shape.

Trust the field on ingest. A block image or math block may carry a `caption`; no other paragraph may.

```crv
![A chart](chart.png)
^ Sales by month
```

```json
{"caption":{"children":[{"children":[{"type":"text","value":"Sales by month"}],"type":"paragraph"}],"type":"caption"},"children":[{"alt":"A chart","src":"chart.png","type":"image"}],"role":"image","type":"paragraph"}
```

```html
<figure>
  <img src="chart.png" alt="A chart">
  <figcaption>Sales by month</figcaption>
</figure>
```

An image is in one of three states: it has alt text in `alt`; its alt text is unknown, with neither `alt` nor `decorative`; or it is decorative, with `decorative: true` and no `alt`. A parse always produces `alt`, the empty string for `![](x)`, so the unknown state comes only from an import or a supplied tree.

## Captions

A caption is a `caption` node with block `children` and an optional inline `short`. In 0.2 a caption attaches to an image, a table, a code block, a quote, a math block, or a figure group, and each carries it in its own `caption` slot. The parser makes no wrapper node: the 0.1 `figure` type is gone, and a 2.0 reader refuses it.

`short` replaces the 0.1 `shortCaption`. It is a structured label for a list of figures, not a second visible caption. Carve source has no spelling for it, a parser never derives it from the full caption, HTML ignores it, and the Carve writer drops it and reports `field-unspellable` for `/caption/short`.

## Tables

A `table` holds table groups in `children`: at most one `table_head`, then the `table_body` nodes, then at most one `table_foot`. Each group holds `table_row` nodes, and each row holds `table_cell` nodes. There is no flat row list and no count object; the groups are the partition. A table also has `columns`, one `table_column` per column.

```crv
|= Name |={>} Qty |
| Apples | 3 |
| Pears | < |
^ Inventory
```

```json
{"caption":{"children":[{"children":[{"type":"text","value":"Inventory"}],"type":"paragraph"}],"type":"caption"},"children":[{"children":[{"children":[{"children":[{"children":[{"type":"text","value":"Name"}],"type":"cell_paragraph"}],"header":true,"type":"table_cell"},{"align":"right","children":[{"children":[{"type":"text","value":"Qty"}],"type":"cell_paragraph"}],"header":true,"type":"table_cell"}],"type":"table_row"}],"type":"table_head"},{"children":[{"children":[{"children":[{"children":[{"type":"text","value":"Apples"}],"type":"cell_paragraph"}],"header":false,"type":"table_cell"},{"children":[{"children":[{"type":"text","value":"3"}],"type":"cell_paragraph"}],"header":false,"type":"table_cell"}],"type":"table_row"},{"children":[{"children":[{"children":[{"type":"text","value":"Pears"}],"type":"cell_paragraph"}],"colspan":2,"header":false,"type":"table_cell"},{"children":[],"header":false,"span":"colspan","type":"table_cell"}],"type":"table_row"}],"type":"table_body"}],"columns":[{"type":"table_column"},{"resolvedAlign":"right","type":"table_column"}],"type":"table"}
```

```html
<table>
  <caption>Inventory</caption>
  <thead>
    <tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td>Apples</td><td style="text-align: right;">3</td></tr>
    <tr><td colspan="2">Pears</td></tr>
  </tbody>
</table>
```

What the example shows:

- **Cells hold blocks.** A cell written in a pipe table holds one `cell_paragraph` with inline children, which renders without a paragraph element. An imported cell may hold other blocks. Carve source spells only the first form; the writer reports the loss for the second.
- **Spans keep their mark.** The `<` cell stays in the tree as an empty cell with `span: "colspan"`, and the cell it extends carries the resolved `colspan: 2`. A count derived from a mark is a resolution result; a count without a mark describes an imported span, and a count that contradicts its mark is refused. A `rowspan` never crosses a group.
- **Columns separate authored and resolved alignment.** A `table_column` keeps authored `align` and `valign` from the `aligns` and `valigns` attributes, and `width` from `widths`, beside the results `resolvedAlign` and `resolvedValign`. Here the second column's alignment came from the header cell mark `|={>}`, so only `resolvedAlign` is set. A cell's own mark overrides its column.
- **Accessibility fields come from imports.** A cell may carry `scope` and `headerIds`; a parse never produces either.

The `header-rows`, `footer-rows`, and `body-rows` attributes set the partition when the table is parsed, and they are then consumed: they appear in neither `attrs` nor any count field. This table has a head, two bodies, and a foot:

```crv
{aligns=left,right footer-rows=1 body-rows=1,1}
|= Item |= Qty |
| Apples | 3 |
| Pears | 2 |
| Total | 5 |
```

```json
{"children":[{"children":["..."],"type":"table_head"},{"children":["..."],"type":"table_body"},{"children":["..."],"type":"table_body"},{"children":["..."],"type":"table_foot"}],"columns":[{"align":"left","resolvedAlign":"left","type":"table_column"},{"align":"right","resolvedAlign":"right","type":"table_column"}],"type":"table"}
```

The rows of each group are elided; every group holds one row, and the table has no `attrs`. `body-header-rows` puts header rows at the start of a body, and `body-header-cols` sets a body's `rowHeadColumns`. HTML renders one `tbody` per body.

**A continuation row leaves no node.** A `+` row is joined into the row above before inline parsing, and the cell holds the nodes of each fragment with one space of ordinary text between them. The 0.1 `cell_wrap` node, the `cellWraps` field, and `table_row.continuationLines` are gone; where the row broke is spelling, recorded as `wraps` and `continuationLines` in the sidecar. A continued row, its cells, and their joined text have no `pos`.

A pipe table and a delimited (CSV or TSV) table with the same cells in the same groups are equal trees. Which form the author used is the sidecar fact `sourceFormat`.

## Lists and tasks

A `list` carries `children` of `list_item` nodes, a `marker`, and `spacing` (`tight` or `loose`), which is set when the list closes; no attribute overrides it. `marker.start` is omitted when it is 1.

```crv
3) three
4) four
```

```json
{"children":["..."],"marker":{"delimiter":")","kind":"ordered","start":3,"style":"1"},"spacing":"tight","type":"list"}
```

The items are elided. A task item carries `task`, a closed object with only `mark`, one of space, `x`, `_`, `-`, `/`, `!`, `>`, and `?`; a parsed `X` becomes `x`. Status is derived from the mark through `task-states.json` and is never stored. This replaces the 0.1 pair `checked` and `taskState`.

```crv
- [ ] open
- [x] done
- [/] in progress
```

gives the marks `{"mark":" "}`, `{"mark":"x"}`, and `{"mark":"/"}`. Task state does not split a list: these three items are one list.

## Adjacent text runs are coalesced

A node list holds no two adjacent `text` nodes. Adjacent runs are joined in the tree that `parse` returns, not in the encoder, or the round trip fails. A merged run keeps a `pos` only where its pieces are contiguous in the source.

A backslash escape is not a node: the escaped character is part of the surrounding `text` value, and a writer computes the escapes it needs. The 0.1 `escaped_text` type is gone, so in 0.2 nothing distinguishes an escaped character in the tree; that is spelling.

## Nonbreaking spaces and literal Unicode

An escaped space (`\ `) is a `non_breaking_space` node with no value, one node per space. Every string field holds literal Unicode, so U+E000 and other private-use characters keep their authored meaning, and no temporary marker of a parser or writer is ever published. A reader replaces every U+0000 in an ingested string with U+FFFD before it uses the value.

## Producing it

::: code-group

```bash [CLI]
carve ast document.crv              # bare tree with positions
carve ast --envelope document.crv   # envelope for storage
carve render --from-ast tree.json   # render a tree in JSON
carve fmt --from-ast tree.json      # write a tree as Carve source
```

```js [carve-js]
import { parse, encodeTree, decodeTree } from '@markup-carve/carve'

const json = encodeTree(parse(source))
const tree = decodeTree(json)
```

:::

Every engine offers the same library calls (`parse`, `parseWithDiagnostics`, `parseWithLayout`, `encodeTree`, `encodeEnvelope`, `decodeTree`, `validateTree`, `write`, `migrateTree`, and the rest), spelled by the conventions of its language. `encodeTree` writes the JSON Canonicalization Scheme (RFC 8785): no whitespace, members sorted by name as UTF-16 code units, and one spelling per string and number. One tree therefore has one encoding, and one `treeFingerprint`, in every engine. Readers accept members in any order.

Numbers are finite IEEE 754 binary64 values everywhere in the tree, including opaque `props`, `data`, and payloads. `1.0`, `1E2`, and `-0` are read and written as `1`, `100`, and `0`; `9007199254740993` and `1e400` are refused because no binary64 value denotes them exactly.

## Validating your own output

The schema is a plain [JSON Schema 2020-12](https://json-schema.org/) document, so any validator reads it:

::: code-group

```js [Node]
import { Ajv2020 } from 'ajv/dist/2020.js'

const url = 'https://markup-carve.github.io/carve/spec/0.2/data/ast-schema.json'
const schema = await (await fetch(url)).json()
const validate = new Ajv2020({ allErrors: true }).compile(schema)

if (!validate(myTree)) console.error(validate.errors)
```

```python [Python]
import json, urllib.request, jsonschema

url = "https://markup-carve.github.io/carve/spec/0.2/data/ast-schema.json"
schema = json.load(urllib.request.urlopen(url))
jsonschema.validate(instance=my_tree, schema=schema)
```

:::

A schema pass alone does not make a tree valid. The reader checks cover what the schema cannot express: nesting depth, position order and agreement with the source when it is available, the order of table groups, the children of a table cell, keys that occur once in `keyValues`, smart punctuation glyphs, declared `data` keys and extension slots, envelope version agreement, span counts against their marks, and more. Run your output through `validateTree`, or through `decodeTree` with the `source` option to check positions against the source:

```js
import { decodeTree } from '@markup-carve/carve'

decodeTree(json, { source }) // throws CarveTreeError with the failing path
```

## Round trip

`parse(x)`, encoded to JSON and decoded, equals `parse(x)` in every field, positions included. A serializer that loses a field breaks a consumer one document later.

## A default has one encoding

A default value is written by omitting the field, and a reader refuses the spelled-out default instead of normalizing it. A supplied tree with `marker.start: 1` is refused with the path `/children/0/marker/start`; so are `mode: "normal"` on a citation, an autolink `text` equal to its `href`, an empty `attrs`, `classes`, or `keyValues`, and an empty `props`, `slots`, `payload`, or `resourceIds` of an extension node. In 0.1 the encoder silently dropped `start: 1`; in 0.2 that tree does not decode.

## Destinations are the author's text, not a sanitized URL

`href`, `src`, and every other destination hold what the author wrote. A producer does not blank or rewrite a destination on the way into the tree, so the tree can hold a scheme no target may emit:

```crv
[click](javascript:alert(1))
```

```json
{"children":[{"type":"text","value":"click"}],"href":"javascript:alert(1)","type":"link"}
```

while the renderer writes `<a href="">` and reports the render loss `destination-denied`.

**A consumer that puts a destination into a URL sink applies the URL policy itself.** If you feed the tree back through a conforming engine, the engine applies the policy for you. If you walk the tree and build your own output, it does not. The engine exports `isUrlAllowed`, `urlScheme`, and `DEFAULT_DENIED_SCHEMES` for that check; the [security model](/security) explains the policy.

## Reading a tree you did not write

A tree from outside is a boundary. Where the contract says a reader refuses, it fails with a typed, documented error that names what was wrong and the JSON path of the node. It does not truncate, repair, drop, or crash, and it does not surface the error of a JSON library. In the JavaScript engine that error is `CarveTreeError`.

A reader refuses:

- a root without `type`, `children`, or `astVersion`, or whose `type` is not `document`;
- a higher major version (`/astVersion: major version 3 is not read by this engine`), and an AST 1.x tree;
- an envelope whose `astVersion` differs from its document's;
- a field the schema does not name, at any node (`/children/0/bogus: not a field of paragraph`), and an unknown node type;
- a node in a place its type may not stand, such as a `table_row` among the document's children;
- an unknown required extension, and an extension node without a valid fallback;
- a node-shaped object inside opaque `data` or `props`, and an undeclared `data` key;
- input nested deeper than its bound. A reader accepts every tree its own parser can produce at the limits of 200 block levels and 200 inline levels per inline content, counted per file, and derives its bound from those limits by the worst cost per level of its own encoding;
- a `srcByteLength` that disagrees with the source, when the reader has the source.

Some things are not refusals. A reader with no source keeps `srcByteLength` as supplied. A reader accepts every minor version of major 2 it can read under the additions a minor version may make; 0.1 refused a higher minor. `keyValues` is never searched for nodes, so `{type=widget}` is an ordinary attribute.

## Extensions, data and the envelope

At a storage or process boundary, wrap the tree in an envelope with `astVersion` and `document`, and optionally `vocabulary` (an object) and `extensions`. An in-memory handoff and `carve ast` without `--envelope` use the bare tree. The envelope and its document carry equal `astVersion` strings:

```json
{"astVersion":"2.0","document":{"type":"document","astVersion":"2.0","children":[],"srcByteLength":0,"stages":["referenceResolution","tableAlignment"],"extensions":[{"name":"org.example.notes","version":"1","required":false,"slots":[]}]},"extensions":[{"name":"org.example.notes","version":"1","required":false,"slots":[]}]}
```

That is `encodeEnvelope` of an empty document that declares one extension. An envelope field other than the four is refused.

**Versions.** `astVersion` versions the contract, not the language. A major version may remove, rename, or reinterpret fields and node types, and ships a migration function from the previous major. A minor version adds only optional declared extensions, extension nodes with a fallback, and namespaced `data`; never a core field or core node type. A new construct therefore enters as an extension node and becomes a core node at the next major version. Until the 0.2.0 release, contract 2.0 may still change.

**Extension declarations.** Each declaration has a qualified `name` such as `org.example.notes`, a boolean `required`, a nonempty `version`, and `slots`, the ordered names of its node slots. Names in one list are distinct. If the root and the envelope both declare a name, they must agree.

**Extension nodes.** A `block_extension` or qualified `inline_extension` carries `name`, `version`, opaque `props`, `children`, optional named `slots`, a same-role `fallback` of core nodes, and optional `payload` and `source`. A reader that does not know an optional extension renders its fallback; a writer writes the fallback and reports `structure-unspellable`:

```json
{"type":"document","astVersion":"2.0","extensions":[{"name":"org.example.chart","version":"1","required":false,"slots":[]}],"children":[{"type":"block_extension","name":"org.example.chart","version":"1","props":{"kind":"bar"},"children":[],"fallback":[{"type":"paragraph","children":[{"type":"text","value":"Chart: sales"}]}]}]}
```

renders `<p>Chart: sales</p>`. Marked `required: true`, the same tree is refused by a reader that does not implement the extension. An unqualified `inline_extension` such as `:kbd[Ctrl]` gives `"name": "kbd"` with its `children` as its fallback and needs no declaration. Reading a tree never runs anything in `payload`, `props`, or `data`. A reader bounds a decoded payload to 8 MiB per node.

**Data.** Every node may carry `data`, an object whose keys are declared qualified names holding opaque JSON. A reader preserves unknown optional data. The standard namespaces are `carve.source` (a foreign locator, see [provenance](/ast-provenance)), `carve.style` (named styles, alignment, spacing, and page facts from word processors), and `carve.annotation` (see [annotation ranges](/ast-annotation-ranges)). Parsing Carve source produces none of them, the HTML renderer and the Carve writer ignore them, and equality compares them.

**Resources.** `document.resources` is a manifest of closed entries with `id`, `mediaType`, a `sha256:` `digest`, and optional `href` and `size`, which images and extension nodes reference by id.

## Containers and line blocks

The name on a `:::` opener decides the node type. An admonition name (`danger`, `example`, `info`, `note`, `quote`, `success`, `tip`, `warning`) gives an `admonition`, and a directive name (`bibliography`, `footnotes`, `glossary`, `index`, `references`, `toc`) gives a `directive`, each with the name as `kind`. `figure` without a title or label gives a `figure_group`. Every other name, or none, gives a `div`, with the name as its first class. A `directive` always carries `children` and may carry a `title` and a `tocTarget`. A bracket label, as in `::: tip [Tab]`, is the string `groupLabel`, not inline content.

A quote is a `block_quote` whether it was written with `>` lines or as a `::: >` fence. A hard-break block is a `div` with the class `hardbreaks` in which every line end is a `hard_break`. Which spelling the author used is in the sidecar.

A line block is a `line_block` whose `children` are `line` nodes, one per line of its body, plus the comments of any comment blocks in it:

```crv
::: |
Roses are red
Violets are blue
:::
```

```json
{"children":[{"children":[{"type":"text","value":"Roses are red"}],"type":"line"},{"children":[{"type":"text","value":"Violets are blue"}],"type":"line"}],"type":"line_block"}
```

An empty line is a `line` with no children, and it ends a stanza. This replaces the 0.1 `lines` pointer arrays.

## Where the nodes are, as data

Which fields of a node hold other nodes depends on its type. The generated file `node-slots.json` lists every node-bearing slot of every type in walk order, from the schema and the standard extensions. For example, `block_quote` has `children` then `caption`, and `block_extension` has `children`, `slots.*`, then `fallback`. Typed metadata slots (`metadata.title` and others) are listed for every type, and the `recursive` entry says how to walk metadata values. Copy this file rather than deriving your own; it replaces the 0.1 `node-roles.json`. [Parsed document JSON](/ast-json#walk-the-tree) shows a walker built on it.

Resolution visits `title`, then `children`, then `caption`, in source order, which decides the order of caption, equation, and footnote numbers.

## Sidecars

Two records travel beside the tree, never in it: the [source-layout sidecar](/ast-source-layout), which `parseWithLayout` returns, and [annotation ranges](/ast-annotation-ranges), which a host supplies to `validateTree` or `decodeTree`. Each validates against its own schema, addresses nodes by RFC 6901 pointers into the tree it came with, and does not survive a canonical write. Two documents that differ only in sidecar content are the same document.

The 0.1 node identity and provenance sidecars have no 0.2 counterpart; see [node identity](/ast-node-identity) and [provenance](/ast-provenance) for what replaced them.

Diagnostics are not tree content either. A parse, render, write, and lint run report into one diagnostics record beside the tree. Each entry has a `code`, a `severity`, a `channel` (`parse`, `render-loss`, or `lint`), a `message`, and optionally a byte `range` and a `path` into the tree.

## What is not in it

No node carries pre-escaped text, formatter-internal nodes are never published, and an unresolved reference stays a `link`. Resolution results a consumer would otherwise recompute are published beside the authored construct: footnote numbers, caption and equation numbers, resolved destinations, table alignment, and generated heading ids. A heading id is not a function of its heading alone, since deduplication depends on every heading before it.

A generated heading id is in `heading.generatedId`, never in `attrs.id`. `attrs.id` holds only an id the author wrote. For `# A & B`, 0.1 put the generated `A-B` in `attrs.id`; 0.2 puts it in `generatedId`.

## Definition lists

A `definition_list` holds `definition_term`, `definition_description`, and source `comment` nodes in `children`, in document order. A term holds inlines and a description holds blocks:

```crv
:: Term one
:: Term two
: The shared description.
```

```json
{"children":[{"children":[{"type":"text","value":"Term one"}],"type":"definition_term"},{"children":[{"type":"text","value":"Term two"}],"type":"definition_term"},{"children":[{"children":[{"type":"text","value":"The shared description."}],"type":"paragraph"}],"type":"definition_description"}],"type":"definition_list"}
```

A run of terms belongs to the descriptions that follow it, so the grouping is derivable and is not published. A `definition_list` has no `spacing` and no `loose` field: a renderer reads the blocks of each description. This replaces the 0.1 `items` field.

## Composite figures

`::: figure` produces a `figure_group` with block `children` in source order and an optional `caption` for the group. Its panels are the tables among its children, and the image paragraphs, code blocks, quotes, and math blocks that carry a caption; there is no separate panel list.

```crv
::: figure
![Left](l.png)
^ Left view

![Right](r.png)
^ Right view
:::
^ Two views
```

```json
{"caption":{"children":[{"children":[{"type":"text","value":"Two views"}],"type":"paragraph"}],"type":"caption"},"children":[{"caption":{"children":[{"children":[{"type":"text","value":"Left view"}],"type":"paragraph"}],"type":"caption"},"children":[{"alt":"Left","src":"l.png","type":"image"}],"role":"image","type":"paragraph"},{"caption":{"children":[{"children":[{"type":"text","value":"Right view"}],"type":"paragraph"}],"type":"caption"},"children":[{"alt":"Right","src":"r.png","type":"image"}],"role":"image","type":"paragraph"}],"type":"figure_group"}
```

The 0.1 single `figure` node, and with it the distinction between a figure wrapping a table and a table's own caption, is gone. `migrateTree` turns a 1.x figure that holds one captionable block into that block with the figure's caption and attributes, and any other figure into a `figure_group`.

## Citations

Core Carve 0.2 has no citation syntax; citations are an extension. In core, `[@key]` is text holding a mention. The citation nodes exist for extensions and imported trees:

- A `citation_group` carries `children` of `citation` nodes and `raw`, the bracket text as written, which renders when a key has no entry. A `citation` occurs nowhere else.
- Each `citation` carries `key`, `namespace: "citation"`, optional inline `prefix` and `suffix`, an optional `locator` object with a string `label` and inline `children`, and an optional `mode` of `author-in-text` or `suppress-author`. Absence means `normal`, which is never written. A group has no mode.
- A `citation_definition` carries `key`, `namespace`, inline `children`, and optional typed `metadata.bibliography` (`title`, `containerTitle`, `authors`, `issued`, `doi`, `url`), not bibliographic attributes.

Where no extension handles citations, HTML writes `raw` as text and a `citation_definition` writes nothing; the Carve writer writes `raw` and reports `structure-unspellable` for a definition.

## Code block payload line endings

`code_block.value` holds every payload character, the final line break included. A closed fence with the line `a` has the value `"a\n"`, and a closed fence with no line has `""`:

````crv
```
a
```
````

```json
{"type":"code_block","value":"a\n"}
```

An unclosed fence that ends the source without a line break still ends its value with one. A built or imported code block may hold `"a"`, which is a different value, and a reader does not append a break. Writing `"a"` as a Carve fence adds the break and reports `field-unspellable` at the value's path. `raw_block.value` follows the same rules. In 0.1 the field was `content`; `migrateTree` renames it.

## Shapes that Carve source cannot spell

An interchange-only shape is a node, field, or wrapper that only a format bridge or another producer supplies. A parser never produces one, JSON encoding and decoding keep it, and a Carve writer invents no syntax for it and reports what it could not write:

| Shape | Carve writer | HTML |
| --- | --- | --- |
| `caption.short` | omits the field | renders the full caption once |
| `table_cell.scope` and `headerIds` | reports each field | writes `scope` and `headers` attributes |
| `image.longDescription` | reports the field | renders its blocks after the image |
| `image.decorative: true` | writes empty brackets and reports nothing | writes an empty `alt` |
| `image.decorative: false` | reports the field | writes `alt` as given |
| an `image` with neither `alt` nor `decorative` | writes empty brackets and reports `image-alt-unknown` | writes no `alt` |
| `xref.display` | reports the field | uses the default core text |
| blocks in `table_cell.children` | reports the loss | renders the blocks in the cell |
| `small_caps` | writes the children | a `span` with class `smallcaps` |
| `section` | writes the children | a `section` element |
| `ruby` | writes each base with its annotation in parentheses | a `ruby` element |
| an extension node with an unknown name | writes the fallback | renders the fallback |
| `math.numberPrefix` on a display equation | reports the field | writes the number after the math, as `Equation 1` |

For example, a supplied `ruby` with one pair, base `漢` and annotation `kan`, renders `<ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby>` and writes `漢(kan)` with `structure-unspellable` at the node's path. The reported losses come back from `writeWithDiagnostics`; `write` throws `CarveWriteError` instead.

## Migrating older trees

A 2.0 reader refuses a tree of another major version, and it refuses the retired node types `escaped_text`, `critic_substitution`, `cell_wrap`, and `figure`. Upgrade stored trees with `migrateTree` or `carve migrate-ast`, which take a 1.x tree or an earlier 0.2 draft tree, bare or in an envelope. Changing `astVersion` by hand is not migration. The migration is lossy for spelling by design; it reports a `migration-loss` warning for any other stored fact it could not keep.

```json
{"type":"document","astVersion":"1.2","children":[{"type":"list","items":[{"type":"list_item","checked":true,"children":[{"type":"paragraph","children":[{"type":"text","value":"done"}]}]}]},{"type":"thematic_break","marker":"*"}],"srcByteLength":15}
```

`carve migrate-ast` turns that 1.2 tree into:

```json
{"astVersion":"2.0","children":[{"children":[{"children":[{"children":[{"type":"text","value":"done"}],"type":"paragraph"}],"task":{"mark":"x"},"type":"list_item"}],"marker":{"char":"-","kind":"bullet"},"spacing":"tight","type":"list"},{"type":"thematic_break"}],"srcByteLength":15,"type":"document"}
```

The main changes from 1.x to 2.0:

| 1.x | 2.0 |
| --- | --- |
| `items`, `rows`, `cells` | `children`, with table groups and `cell_paragraph` |
| `ordered`, `start`, `olType`, `delim`, `bareMarker`, `bulletChar`, `tight` on lists | `marker` object and `spacing`; bare-dot spelling goes to the sidecar |
| `checked`, `taskState` | `task.mark` |
| `ref`, `label`, `abbr` | `key` and `namespace` |
| `rawRef` | `refForm` in the tree; the typed spelling in the sidecar |
| `content` on code, math, raw, and frontmatter nodes | `value` |
| `blockImage`, `blockMath` | `role: "image"`, `role: "math"` |
| `figure` and `shortCaption` | the captioned block's own `caption` with `short`, or `figure_group` |
| `rowGroups`, `columns` records | table groups and `table_column` nodes |
| `attrs.keyValues` object and `attrs.order` | `keyValues` as an ordered list of pairs |
| a generated heading id in `attrs.id` | `generatedId` (a migrated tree keeps old ids as authored, since it cannot tell them apart) |
| `heading_ref` | `xref` with `key`, `namespace`, `href`, and `display` |
| `thematic_break.marker`, `table.separatorWidths`, `cell_wrap` | dropped |
| `resolved: true` on references | an empty-string `href` or `src` |

## Changed in 0.2

Beyond the migration table, three reading rules changed. Offsets count UTF-8 bytes instead of code points. A reader accepts higher minor versions of its major. A reader refuses a spelled-out default such as `start: 1` instead of normalizing it.

**Specification (external):** [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [root, envelope and versions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#root-envelope-and-versions), [node grammar](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#node-grammar), [node types](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#node-types), [blocks](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#blocks), [inline nodes](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#inline-nodes), [extension nodes, foreign data and resources](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources), [resolution results](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#resolution-results), [positions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#positions), [equality](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#equality), [reading a tree](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#reading-a-tree), [diagnostics](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#diagnostics), [shapes that Carve source cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell), [migration](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#migration), [standard data namespaces](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#standard-data-namespaces), [tooling: library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library), [upgrade guide: tree consumers](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#part-3-tree-consumers-ast-1x-to-20), [`ast-schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/ast-schema.json), [`ast-results.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/ast-results.json), [`node-slots.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/node-slots.json).
