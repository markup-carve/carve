# Carve 0.2: the AST, contract 2.0

Status: first draft on `next2`. Nothing in this document is implemented yet.

This document defines the tree a Carve 0.2 parser returns and its JSON form, which one implementation writes and another reads. It is ported from the contract 2.0 draft on the `next-ast2` branch (PART 12 of the 0.1 grammar, clauses CARVE-P12-nnn) and brought in line with the 0.2 syntax. Spelling that the draft kept in the tree lives in the source-layout sidecar, which has its own document (`source-layout.md`).

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-A-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused.
- `C2-B-nnn` and `C2-I-nnn` name clauses of the block and inline chapters, `C2-L-nnn` clauses of the source-layout document.
- The machine-readable form of this contract is `resources/ast-schema.json`. Where the schema on `next2` and this document disagree, the section "Schema changes owed" lists the edit.
- JSON examples are complete, valid JSON. They leave out `pos` unless the example is about positions.
- A *producer* writes a tree, a *reader* ingests one, a *writer* turns a tree into Carve source or another format.

## Tree and sidecars

**C2-A-001** The tree holds meaning. A fact is a tree field only when it changes rendered output or a later resolution.

**C2-A-002** Spelling that changes neither is not in the tree. It is recorded in the source-layout sidecar (`source-layout.md`).

**C2-A-003** Source layout, node identity, annotation ranges and provenance are sidecars: each is returned only when the caller asks, validates against its own schema, addresses nodes by RFC 6901 pointers into the tree it came with, and is never placed inside the tree.

**C2-A-004** Two documents that differ only in sidecar content are the same document.

**C2-A-005** Diagnostics are not tree content either: they are one record beside the tree (C2-A-172).

**C2-A-006** The shape defined here is the interchange contract. An implementation whose internal tree differs maps it on output and does not export its internal shape.

**C2-A-007** Node type names and field names are spec surface. An implementation does not invent a synonym and does not publish a field this contract does not name.

## Root, envelope and versions

**C2-A-008** The root is a node of type `document`. It carries block `children` and `astVersion`, which is `"2.0"`.

**C2-A-009** The root may carry `srcByteLength`, `extensions`, `stages`, `resources` and the common node fields (C2-A-027). No other root field is allowed.

**C2-A-010** `srcByteLength` is the number of source bytes read. Zero means an empty source, and an absent field means the source was not measured. A reader ignores a value that is present but wrong.

**C2-A-011** Document content does not hang off the root: frontmatter and definitions are nodes in `children`.

```json
{
  "type": "document",
  "astVersion": "2.0",
  "srcByteLength": 5,
  "children": [
    { "type": "paragraph", "children": [{ "type": "text", "value": "Hello" }] }
  ]
}
```

**C2-A-012** At a storage or process boundary the tree travels inside an envelope with `astVersion` and `document`, and optionally `vocabulary` and `extensions`. An in-memory handoff and `carve --json` use the bare tree.

**C2-A-013** The envelope wraps the tree and does not change it: the `document` inside keeps its own `astVersion`, and every clause here applies to it.

```json
{
  "astVersion": "2.0",
  "extensions": [{ "name": "org.example.notes", "version": "1", "required": false }],
  "document": { "type": "document", "astVersion": "2.0", "children": [] }
}
```

**C2-A-014** `astVersion` is `major.minor` and versions this contract, not the language. A leading zero is refused.

**C2-A-015** A major version may remove, rename or reinterpret a field or a node type.

**C2-A-016** A minor version adds only three things: optional declared extensions, extension nodes with a fallback, and namespaced `data`. It adds no core field and no core node type.

**C2-A-017** An extension declaration has a qualified `name`, a boolean `required` and an optional `version`. An absent `version` means the extension does not version its payload, and a producer does not write a placeholder in its place.

**C2-A-018** A reader refuses a higher major version, an unknown required extension, an unknown core field, an unknown core node type and an extension node without a valid fallback.

**C2-A-019** A reader accepts a higher minor version when every addition is one that C2-A-016 allows.

**C2-A-020** No reader has a degrade-and-report path for an unknown core node type, format bridges included: under C2-A-016 such a type can only come from a broken tree or from another major version.

## Node grammar

**C2-A-021** Every node is a JSON object with a `type` that holds its node type name.

**C2-A-022** `children` is the primary content slot of every node that holds other nodes.

**C2-A-023** `value` is the literal payload of a node that holds text: `text`, `code`, `code_block`, `math`, `raw_block`, `raw_inline`, `literal_inline`, `comment`, `critic_comment` and `frontmatter`.

**C2-A-024** Content with a different role sits in a named secondary slot: `caption` on a table, a figure and a figure group, `short` on a caption, `prefix`, `locator` and `suffix` on a citation, `pairs` on ruby with `base` and `annotation` on each pair, `title` on a code block, an admonition and a directive, `fallback` on an extension node, and each entry of an extension node's `slots`. The `old` and `new` slots of the `next-ast2` draft are gone with the `critic_substitution` node.

**C2-A-025** A walker visits `children` first and then the secondary slots in the order of C2-A-024. It does not treat a string `value`, a `source`, a URL, opaque `data` or an extension `payload` as a child.

**C2-A-026** The slot table `resources/node-roles.json` is generated from the schema and names every slot that holds nodes, so a walker needs no knowledge of single node types.

**C2-A-027** Every typed node may carry the common fields `attrs`, `data`, `pos`, `segments`, `metadata`, `dir` and `lang`, as far as its schema definition allows.

**C2-A-028** Nodes are closed: a field the schema does not name on a node type is an error (C2-A-169).

**C2-A-029** `data` is the one must-ignore zone. Its keys are qualified extension names declared on the root or the envelope, and a reader keeps unknown optional `data` without interpreting it.

**C2-A-030** `metadata` values are scalars, nested arrays and objects, or lists of block nodes. A walker recurses into `metadata` and into extension `props` and visits the block nodes it finds there.

**C2-A-031** `dir` is `ltr`, `rtl` or `auto`. `dir` and `lang` are inherited from the nearest ancestor that carries them.

### Attributes

**C2-A-032** `attrs` holds the attribute blocks attached to a node: an optional single `id`, an ordered `classes` list and `keyValues`, an ordered list of pairs. Each pair is a list of two strings, the key and its value, and the pairs stand in written order. A bare key has the empty string as its value. The draft had a JSON object here; a list reads in the same order in every language.

**C2-A-033** The tree records no order between the kinds of parts. The written order is fixed: the id, then the classes as written, then the language, then the keys as written (C2-B-076). The draft's `attrs.order` field is deleted.

**C2-A-034** A key named `id` or `class`, in any ASCII letter case, is not a member of `keyValues`: it folds into `id` or `classes` when the block is parsed, and of several ids the last one written wins (C2-B-077).

**C2-A-035** Glued attribute blocks and consecutive attribute lines are merged before the tree is built: classes add up, and a later key replaces an earlier key of the same name (C2-B-071, C2-I-035). A key occurs once in `keyValues`, at the place where it was first written.

**C2-A-036** A reader never looks for nodes inside `keyValues`: `{type=widget}` is an ordinary attribute.

**C2-A-037** The language part of an attribute block sets the node field `lang` and is not a key: `{:en}` is the shorthand for `lang: "en"` on the node. A writer puts it after the classes.

**C2-A-038** `attrs.id` holds only an id the author wrote. A generated heading id is not stored there (C2-A-134).

**C2-A-039** `attrs.id` is an anchor in the document. For a duplicate id the first node in document order wins, and the producer reports each later one as a diagnostic.

```json
{
  "type": "span",
  "attrs": { "id": "a", "classes": ["x", "y"], "keyValues": [["data-n", "1"], ["hidden", ""]] },
  "lang": "en",
  "children": [{ "type": "text", "value": "t" }]
}
```

## Text and literal payload

**C2-A-040** A node list holds no two adjacent `text` nodes. Adjacent runs are joined in the tree that `parse` returns, not in the encoder.

**C2-A-041** A backslash escape is not a node. The escaped character is part of the surrounding `text` value, and a writer computes the escapes it needs. The draft's `escaped_text` type is gone.

**C2-A-042** An escaped space is a `non_breaking_space` node with no value. One node stands for one space.

**C2-A-043** Every string field holds literal Unicode. No private-use character has a special meaning, and a temporary marker of a parser or writer is never published.

**C2-A-044** A reader replaces every U+0000 in an ingested string with U+FFFD before it uses the value.

**C2-A-045** `code_block.value` holds every payload character, the final line break included. A closed fence with one line `a` has the value `"a\n"`, and a closed fence with no line has `""`. Container prefixes and fence delimiters are not payload.

**C2-A-046** A fence that ends with its container keeps whether its last line had a line break. A producer does not add one.

**C2-A-047** A built or imported code block may hold `"a"` with no final break, which is a different value from `"a\n"`. A reader does not append a break.

**C2-A-048** `raw_block.value` follows the same rules as `code_block.value`.

**C2-A-049** `frontmatter` is the first child when present. It carries `format`, which is the word on its opener or `"yaml"` when there is none, and `value`, the text between the delimiters as written. A producer does not publish parsed keys in its place.

## Node types

Contract 2.0 as drafted on `next-ast2` has 75 node types. This document has 73: `escaped_text`, `critic_substitution` and `cell_wrap` are gone, and `line` is new.

**C2-A-050** The node types are those of the table below. A tree that holds any other core `type` is refused (C2-A-018).

The table is written from the schema. "blocks" and "inlines" mean any block node and any inline node. A field with `?` is optional. The common fields of C2-A-027 are left out.

| Type | Occurs in | `children` | Fields |
| --- | --- | --- | --- |
| `abbreviation` | inline | none | `key`, `namespace`, `expansion`? |
| `abbreviation_def` | top level | none | `expansion`, `key`, `namespace` |
| `admonition` | block | blocks | `kind`, `title`?, `groupLabel`? |
| `autolink` | inline | none | `href`, `text`? |
| `block_extension` | block | blocks | `name`, `version`?, `props`?, `slots`?, `fallback`, `payload`?, `resourceIds`? |
| `block_quote` | block | blocks | none |
| `caption` | `caption` slot | blocks | `short`? |
| `caption_number` | inline | none | `n`? |
| `cell_paragraph` | `table_cell` | inlines | `blockImage`? |
| `citation` | `citation_group` | none | `key`, `prefix`?, `locator`?, `locatorLabel`?, `locatorValue`?, `suffix`?, `suppressAuthor`, `mode`?, `number`?, `useIndex`?, `namespace` |
| `citation_definition` | top level | inlines | `key`, `namespace` |
| `citation_group` | inline | `citation` | `raw`, `mode`? |
| `code` | inline | none | `value` |
| `code_block` | block | none | `value`, `syntax`?, `title`?, `groupLabel`? |
| `comment` | block, inline | none | `form`, `value` |
| `critic_comment` | inline | none | `value` |
| `definition_description` | `definition_list` | blocks | none |
| `definition_list` | block | `definition_term`, `definition_description` | `spacing` |
| `definition_term` | `definition_list` | inlines | none |
| `delete` | inline | inlines | none |
| `directive` | block | blocks | `kind`, `title`?, `groupLabel`?, `tocTarget`? |
| `div` | block | blocks | `groupLabel`? |
| `document` | root | blocks | `astVersion`, `srcByteLength`?, `extensions`?, `stages`?, `resources`? |
| `emphasis` | inline | inlines | none |
| `figure` | block | blocks | `caption`?, `kind`? |
| `figure_group` | block | blocks | `caption`? |
| `footnote` | top level | blocks | `key`, `namespace` |
| `footnote_ref` | inline | none | `number`?, `key`, `namespace` |
| `frontmatter` | top level, first child | none | `format`, `value` |
| `hard_break` | inline | none | none |
| `heading` | block | inlines | `level`, `generatedId`? |
| `highlight` | inline | inlines | none |
| `image` | inline | none | `src`?, `alt`?, `decorative`?, `tooltip`?, `targetKind`?, `key`?, `namespace`?, `resourceId`?, `form`? |
| `inline_extension` | inline | inlines | `name`, `version`?, `props`?, `slots`?, `fallback`?, `payload`?, `resourceIds`? |
| `inline_footnote` | inline | inlines | `number`? |
| `insert` | inline | inlines | none |
| `line` | `line_block` | inlines | none |
| `line_block` | block | `line` | none |
| `link` | inline | inlines | `href`?, `tooltip`?, `targetKind`?, `key`?, `namespace`?, `form`? |
| `link_reference_definition` | top level | none | `href`, `title`?, `key`, `namespace` |
| `list` | block | `list_item` | `marker`, `spacing` |
| `list_item` | `list` | blocks | `task`? |
| `literal_inline` | inline | none | `value` |
| `math` | inline | none | `display`, `number`?, `value`, `numberPrefix`? |
| `mention` | inline | none | `target`, `kind`, `label`? |
| `non_breaking_space` | inline | none | none |
| `paragraph` | block | inlines | `blockImage`? |
| `raw_block` | block | none | `format`, `value` |
| `raw_inline` | inline | none | `format`, `value` |
| `ruby` | inline | none | `pairs` |
| `rubyPair` | `ruby.pairs` | none | `base`, `annotation` |
| `section` | block | blocks | `level`? |
| `small_caps` | inline | inlines | none |
| `smart_punctuation` | inline | none | `kind`, `glyph`?, `source` |
| `soft_break` | inline | none | none |
| `span` | inline | inlines | none |
| `strike` | inline | inlines | none |
| `strong` | inline | inlines | none |
| `subscript` | inline | inlines | none |
| `superscript` | inline | inlines | none |
| `symbol` | inline | none | `name` |
| `table` | block | table groups | `columns`, `caption`? |
| `table_body` | `table` | `table_row` | `headRows`?, `rowHeadColumns`? |
| `table_cell` | `table_row` | blocks, `cell_paragraph` | `header`, `span`?, `colspan`?, `rowspan`?, `align`?, `valign`? |
| `table_column` | `table.columns` | none | `align`?, `valign`?, `width`?, `resolvedAlign`?, `authored`? |
| `table_foot` | `table` | `table_row` | none |
| `table_head` | `table` | `table_row` | none |
| `table_row` | table group | `table_cell` | none |
| `tag` | inline | none | `name` |
| `text` | inline | none | `value` |
| `thematic_break` | block | none | none |
| `underline` | inline | inlines | none |
| `xref` | inline | none | `href`?, `key`, `namespace`, `form`? |

**C2-A-051** A list of blocks admits only content blocks. A type that exists only inside its container (`list_item`, `definition_term`, `definition_description`, `line`, the table groups, `table_row`, `table_cell`, `cell_paragraph`, `caption`, `citation`, `rubyPair`, `table_column`) is refused anywhere else.

**C2-A-052** `footnote`, `link_reference_definition`, `abbreviation_def` and `citation_definition` occur only in `document.children`, because a definition stands at the top level (C2-B-062). A reader refuses one inside a container.

## Blocks

### Lists and tasks

**C2-A-053** A `list` carries `children` of `list_item` nodes, one `marker` object and `spacing`.

**C2-A-054** A bullet marker is `{"kind": "bullet", "char": c}` where `c` is `-` or `*`.

**C2-A-055** `marker.char` is meaning: an item with the other character starts another list (C2-B-032).

**C2-A-056** An ordered marker has `kind: "ordered"` and may carry `style` (`1`, `a`, `A`, `i` or `I`), `delimiter` (`.` or `)`) and `start`. Whether the author wrote numbers or the bare dot is spelling and is not in the marker; the draft's `marker.bare` moved to the sidecar.

**C2-A-057** A marker that carries fields of both kinds is invalid.

**C2-A-058** `marker.start` is the value of the first marker and is omitted when it is 1. A reader that meets `start: 1` drops it.

**C2-A-059** `list.spacing` is `tight` or `loose` and is set when the list closes (C2-B-052). No list attribute overrides it.

**C2-A-060** A task item carries `task`, an object with `mark` and `status`. `mark` is one of the eight characters space, `x`, `_`, `-`, `/`, `!`, `>` and `?`. An authored `X` is recorded as `x`. `_` is kept as its own value, because it renders differently from the space.

**C2-A-061** `status` follows from `mark`: space and `_` are `todo`, `x` is `done`, `-` is `cancelled`, `/` is `in-progress`, `!` is `blocked`, `>` is `partial` and `?` is `other`. A node whose pair disagrees is invalid.

```json
{
  "type": "list",
  "marker": { "kind": "ordered", "style": "1", "delimiter": ".", "start": 2 },
  "spacing": "tight",
  "children": [
    {
      "type": "list_item",
      "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "a" }] }]
    }
  ]
}
```

### Description lists

**C2-A-062** A `definition_list` carries `children`: its `definition_term` and `definition_description` nodes in document order. A term holds inlines and a description holds blocks.

**C2-A-063** The grouping of terms and descriptions is not published. A run of terms belongs to the descriptions that follow it.

**C2-A-064** A `definition_list` carries `spacing`, `tight` or `loose`. What the value means in 0.2 is open (Open, point 1).

### Quotes, divs and their sigil forms

**C2-A-065** A quote is a `block_quote` with block `children`, whether it was written with `>` lines or as a quote fence. The draft's `block_quote.fenced` moved to the sidecar.

**C2-A-066** A named div is a `directive` when its name is one of `bibliography`, `footnotes`, `glossary`, `index`, `references` and `toc`, and an `admonition` otherwise. An anonymous div is a `div`.

**C2-A-067** A `directive` always carries `children` and may carry a `title` and `tocTarget` (`headings`, `figures`, `tables` or `listings`).

**C2-A-068** A hard-break block is not a node type and not a field. It gives the same tree as a div with the class `hardbreaks` in which every line ends with a backslash: a `div` whose `attrs.classes` hold `hardbreaks` and whose line ends are `hard_break` nodes. Which form the author wrote is in the sidecar.

**C2-A-069** A line block is a `line_block` whose `children` are `line` nodes, one per line of its body in order. A `line` holds inline `children`, and an empty line of the body is a `line` with no children. The draft's block children and its `lines` field of pointers are gone.

```json
{
  "type": "div",
  "attrs": { "classes": ["hardbreaks"] },
  "children": [
    {
      "type": "paragraph",
      "children": [
        { "type": "text", "value": "a" },
        { "type": "hard_break" },
        { "type": "text", "value": "b" }
      ]
    }
  ]
}
```

### Headings, thematic breaks and code

**C2-A-070** A `heading` carries `level` and inline `children`. The marker character is not recorded in the tree, and the formatter writes `=`.

**C2-A-071** `heading.level` is a positive integer. Carve source gives 1 to 6, an imported tree may hold more, and a renderer clamps for its target without changing the tree.

**C2-A-072** A `thematic_break` has no fields of its own. The draft's `marker` field is deleted: 0.2 has one spelling, the star run.

**C2-A-073** A `code_block` carries `value` and may carry `syntax`, the language word, and `title`, a list of inlines. The fence character and the fence length are not in the tree.

### Comments

**C2-A-074** A `comment` carries `value` and `form`, which is `block` for a `%%%` block, `line` for a `%%` comment and `braced` for `{% %}`. `form` is meaning: a line comment and a comment block read differently when the source is parsed again.

**C2-A-075** The comment of a comment-only line is a child of the open leaf when one is open, and otherwise of the innermost open container, at its place in source order (C2-B-096).

### Definitions

**C2-A-076** A definition is a child of the document and nothing else. The draft's rules for definitions that were written inside a container and hoisted (CARVE-P12-029 and the position rules that followed from it) are gone, because such a line is text in 0.2.

**C2-A-077** A `link_reference_definition` carries `key`, `namespace: "link"`, `href`, which may be the empty string, and an optional `title`. The draft kept the label as written; in 2.0 `key` is the folded label (C2-A-104).

**C2-A-078** A `footnote` carries `key`, `namespace: "footnote"` and block `children`.

**C2-A-079** An `abbreviation_def` carries `key`, `namespace: "abbr"` and `expansion`.

**C2-A-080** Definitions are nodes with a position, so document order decides which of two definitions wins: the first one (C2-B-066).

### Figures and captions

**C2-A-081** A caption is a `caption` node with block `children` and an optional inline `short`. A producer does not derive `short` from the full caption.

**C2-A-082** In 0.2 a caption attaches to an image, a table, a code block, a quote, a math block or a figure group (C2-B-102). A table carries its caption in its own `caption` slot. An image, a code block, a quote and a math block are wrapped in a `figure` that carries the caption.

**C2-A-083** A `figure` carries block `children`, an optional `caption` and an optional `kind` (`image`, `table`, `listing`, `equation` or `other`). An absent `kind` makes no claim.

**C2-A-084** A `figure_group` carries block `children` in source order and an optional `caption`, the caption of the group. Its panels are the `figure` and `table` nodes among its children; there is no separate panel list.

**C2-A-085** A table inside a figure keeps its own caption, and the caption of the figure describes the figure.

```json
{
  "type": "figure_group",
  "children": [],
  "caption": {
    "type": "caption",
    "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "Two views" }] }]
  }
}
```

### Tables

**C2-A-086** A `table` carries `children` that are `table_head`, `table_body` and `table_foot` nodes. Each group holds `table_row` nodes and each row holds `table_cell` nodes. There is no flat row list and no count object.

**C2-A-087** A table whose source declares no grouping has a head made of its leading rows that hold only header cells, and one body for the rest (C2-B-126).

**C2-A-088** A `table_body` whose partition the source declared carries `headRows`, also when the value is 0. A body the producer inferred omits it. The presence of the field is a tree fact and takes part in equality.

**C2-A-089** A table carries `columns`, a list of `table_column` nodes up to its widest row, empty for an empty table. A column holds the authored `align`, `valign` and `width`, and `resolvedAlign` as a resolution result.

**C2-A-090** `table_column.authored` is `true` on a column the source spelled and absent on one the producer inferred. It is a tree fact and takes part in equality.

**C2-A-091** `table_cell.children` is always a list of blocks. A cell written in a pipe table holds one `cell_paragraph` with inline `children`, which renders without a paragraph element. An imported cell may hold other blocks.

**C2-A-092** A cell carries `header` and may carry `span` (`rowspan` or `colspan`, the mark the author wrote), the resolved `colspan` and `rowspan`, `align` and `valign`. An absent count is 1.

**C2-A-093** A cell with counts and no span marks, as an importer writes it, covers the positions its counts give. Where marks and counts disagree, the marks win.

**C2-A-094** A continuation row leaves no node and no field. Its fragments join the cell above with one space before the cell's inline content is read (C2-B-123), and that space is ordinary text. Where the row broke is spelling and is in the sidecar. The draft's `cell_wrap` node, its `cellWraps` field on `code`, `math` and `raw_inline`, and `table_row.continuationLines` are gone.

**C2-A-095** Four more draft fields are gone: `table.separatorWidths`, because 0.2 has no separator row; `table_cell.sourceContent`, because `cell_paragraph` already says it; `table.sourceFormat`, which moved to the sidecar; and with it any trace of whether a table was written as a pipe table or a delimited table.

```json
{
  "type": "table",
  "columns": [{ "type": "table_column", "align": "right", "authored": true }],
  "children": [
    {
      "type": "table_body",
      "children": [
        {
          "type": "table_row",
          "children": [
            {
              "type": "table_cell",
              "header": false,
              "children": [
                { "type": "cell_paragraph", "children": [{ "type": "text", "value": "1" }] }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Inline nodes

**C2-A-096** `emphasis` and `strong` nest in the order written. There is no combined token, and the draft's `strong.boldItalic` is deleted.

**C2-A-097** A replacement is a `delete` node directly followed by an `insert` node (C2-I-057). There is no `critic_substitution` node.

```json
{
  "type": "paragraph",
  "children": [
    { "type": "delete", "children": [{ "type": "text", "value": "old" }] },
    { "type": "insert", "children": [{ "type": "text", "value": "new" }] }
  ]
}
```

**C2-A-098** A `smart_punctuation` node carries `kind` and `source`, the characters as typed, and may carry `glyph`. `source` stays in the tree, because a renderer with `smartTypography` off prints it.

**C2-A-099** A line break inside a leaf is a `soft_break` or a `hard_break`. Neither has a value.

**C2-A-100** An `inline_footnote` holds its content in `children` and may carry `number` as a resolution result.

**C2-A-101** A `mention` carries `kind`, `target` and an optional visible `label`. A `tag` and a `symbol` carry `name`.

**C2-A-102** A `math` node carries `value` and `display`. A display equation may carry `number` together with `numberPrefix`.

### References

**C2-A-103** A reference use and a definition carry `key` and `namespace` together. The namespaces are `link`, `footnote`, `citation`, `abbr` and `heading`. A direct link or image carries neither.

**C2-A-104** `key` is the folded label: every run of spaces, tabs and line breaks becomes one space, the ends are trimmed, and case is kept (C2-I-073). Uses and definitions fold the same way, so two keys match when they are equal strings.

**C2-A-105** A link or image written as a reference carries `form`: `full` for `[text][label]` and `collapsed` for `[text][]`. `form` is present exactly when `key` is. It replaces the draft's `rawRef`. No tree field holds the reference as typed: the verbatim text is in the sidecar.

**C2-A-106** The tree is pre-resolve. A resolution result is added beside the authored construct and never replaces it.

**C2-A-107** On a reference use an absent `href` or `src` means unresolved, and the empty string means a destination that is empty. There is no `resolved` field.

**C2-A-108** An unresolved reference is still a `link` or an `image` node, never text. It renders from its `children` (or its `alt`), its `key` and its `form`: the renderer rebuilds the source form, the content in brackets followed by `[key]` for `full` or `[]` for `collapsed`. The text as typed is not consulted; it is in the sidecar only.

**C2-A-109** A link reference is looked up in the link definitions first and then in the headings (C2-I-075, C2-I-076). The heading lookup applies to link references only, not to images and not to footnotes. Its result is an `href` on the link, like any other resolution.

**C2-A-110** A trailing attribute block on a reference is ordinary `attrs`, resolved or not.

```json
{
  "type": "link",
  "key": "getting started",
  "namespace": "link",
  "form": "collapsed",
  "children": [{ "type": "text", "value": "getting started" }]
}
```

**C2-A-111** A link or an autolink inside link text stays a node in the tree. A renderer unwraps it.

**C2-A-112** `href`, `src` and every other destination hold what the author wrote. A producer does not blank or rewrite a destination on the way into the tree.

**C2-A-113** A consumer that puts a destination into a URL sink applies the URL policy itself. The tree may hold `javascript:alert(1)`.

**C2-A-114** A link or image may carry `targetKind` (`url`, `wiki`, `doc` or `xref`) for a target that is not a URL.

**C2-A-115** An `image` may carry `alt`, `decorative`, `tooltip` and `resourceId`. An absent `alt` means none was given.

**C2-A-116** A cross-reference is an `xref` with `key`, `namespace` and optional `form` (`number`, `page`, `title` or `full`). Resolution adds `href`, and an unresolved one omits it. A producer does not turn an `xref` into a link.

**C2-A-117** A `footnote_ref` carries `key` and `namespace: "footnote"`, and `number` once resolved. An `abbreviation` carries `key` and `namespace: "abbr"`, and may carry `expansion`.

### Citations

**C2-A-118** A `citation_group` carries `children` of `citation` nodes and `raw`. A `citation` occurs nowhere else.

**C2-A-119** `citation_group.raw` is the bracket text as written. It stays in the tree, because it is what renders when a key has no entry.

**C2-A-120** Each `citation` may carry its own `mode`. A group `mode` is shorthand, and a group that has `mode` while one of its items lacks it is refused.

**C2-A-121** A `citation_definition` carries `key`, `namespace: "citation"`, inline `children` and its metadata as `attrs`. It follows the top-level rule like the other definitions (C2-A-052).

## Extension nodes, foreign data and resources

**C2-A-122** `block_extension` and `inline_extension` have one shape: `name`, optional `version`, typed `props`, `children`, optional named `slots`, a `fallback`, and `payload`, a list of alternatives with `format` and `value`.

**C2-A-123** A name with a dot, such as `org.example.diagram`, names a registered extension. It is declared in the root `extensions` list, and its node carries a `fallback`.

**C2-A-124** A name without a dot is the name of an inline extension written in Carve source. `:kbd[Ctrl]` gives `"name": "kbd"`, needs no declaration, and its `children` are its fallback.

**C2-A-125** A `block_extension` has no source spelling, so its name is always qualified and it always carries a `fallback`.

**C2-A-126** A fallback is core content of the node's own role, block or inline, and validates as such.

**C2-A-127** An unknown optional extension renders through its fallback and is reported as a loss. An unknown required extension is refused.

**C2-A-128** Reading a tree never runs anything in `payload`, `props` or `data`. A host enables active content only through a separate capability outside this contract.

```json
{
  "type": "inline_extension",
  "name": "kbd",
  "children": [{ "type": "text", "value": "Ctrl" }]
}
```

**C2-A-129** A foreign construct with a core equivalent maps to core nodes. One without may be carried in declared `data` or in an extension with a fallback. A writer that cannot carry it reports the loss with its JSON path.

**C2-A-130** The contract promises semantic interchange. It does not promise an editable round trip for a foreign format, and it does not promise that source spelling survives in the tree.

**C2-A-131** `document.resources` is a manifest. Each entry has an `id`, a `mediaType` and a `digest` of the form `sha256:` plus 64 lowercase hex digits, and may have `href` and `size`. `image.resourceId` and extension `resourceIds` name entries by id. A missing or duplicate id is refused.

**C2-A-132** A reader bounds a decoded extension payload to 8 MiB per node, metadata nesting to 64 levels, resource references to 4096 per tree and fallback nesting to 32 extension nodes, and refuses an excess.

## Resolution results

**C2-A-133** Results that a consumer could only get by repeating the resolution are published in the tree, beside the authored construct: footnote numbers, caption numbers, generated heading ids, resolved destinations, resolved column alignment and resolved span counts.

**C2-A-134** A generated heading id is a resolution result. It is published in the heading field `generatedId` and never in `attrs.id`. The draft stored it in `attrs.id` and has no such field, so the field is owed (Schema changes owed, item 27).

**C2-A-135** The root `stages` list names the resolution stages that ran: `blockImagePromotion`, `referenceResolution` and `tableAlignment`. A producer names a stage only when its results are complete.

**C2-A-136** A block image has one form: a `paragraph` that holds nothing but one `image` and carries `blockImage: true`. A parser sets the fact when the paragraph closes (C2-B-109, C2-B-132) and declares `blockImagePromotion`. An `image` never stands in a list of blocks. In a tree that does not declare the stage, an absent field means not computed, and a reader may set it.

**C2-A-137** The formatter writes the source spelling of a promoted paragraph, so promotion does not show in its output.

## Positions

**C2-A-138** Every node of a tree that a parser built from source carries `pos`, except the root and the node types of C2-A-158. Positions are always on; there is no parse option that turns them off.

**C2-A-139** A node that has no position omits `pos`. `pos` is never `null`, and a producer never invents a range.

**C2-A-140** `pos` has six required integers: `startLine`, `endLine`, `startColumn`, `endColumn`, `startOffset` and `endOffset`.

**C2-A-141** Lines and columns count from 1, and columns count code points. Offsets count UTF-8 bytes of the original source from 0, with a byte-order mark and every CR counted as they stand. Ends are exclusive, and every offset falls on a code point boundary.

**C2-A-142** `pos.file`, when present, is the id of the included input the coordinates are measured in. Absent means the top-level input. Positions in different files are never compared.

```json
{
  "type": "text",
  "value": "é!",
  "pos": {
    "startLine": 1, "endLine": 1,
    "startColumn": 3, "endColumn": 5,
    "startOffset": 2, "endOffset": 5
  }
}
```

The invariants below are written so that a test can check each one on any tree and its source.

**C2-A-143** For every `pos`, `startOffset` is not greater than `endOffset`, and line and column are the line and column of the offset in the source.

**C2-A-144** A child lies inside its parent: its `startOffset` is not before the parent's and its `endOffset` is not after it. A node without `pos` is skipped, and its children are compared with the nearest ancestor that has one.

**C2-A-145** Siblings are ordered and disjoint: for two nodes `a` before `b` in one node list, `a.endOffset` is not greater than `b.startOffset`. Nodes without `pos` are skipped. The draft's exception for a hoisted definition is gone.

**C2-A-146** The one exception to C2-A-145: two breaks that meet at one line ending share it.

**C2-A-147** A comment that came from a comment-only line satisfies C2-A-144 and C2-A-145 in the node list C2-A-075 puts it in: the open leaf, or else the innermost open container.

**C2-A-148** A span starts at the markup that opens the construct: the quote mark, the heading marker, the list marker, the colon run of a div, the opening bracket of a link, the backtick run of a fence. Leading indent on the opening line is inside the span of a container and outside the span of a leaf.

**C2-A-149** A table cell is the exception: it spans the text between its pipes.

**C2-A-150** No span starts at a line ending, except the span of a `soft_break` or a `hard_break`.

**C2-A-151** A span ends directly after the last source character the construct owns. A closing delimiter and an attached attribute block are inside; a following line ending, a blank line and an attribute line that attached to nothing are outside.

**C2-A-152** A break owns its line ending, so its end is column 1 of the next line. A hard break also spans its backslash.

**C2-A-153** A break that a parser makes from a plain line ending, with no backslash in the source, has a span: the line ending itself. It is not among the nodes that omit `pos`.

**C2-A-154** A container ends after its closer when it has one, and otherwise after its last child that has a position. A container starts at its opening markup and ends at its closing markup also when its first or last child has no position.

**C2-A-155** A container with no positioned child spans its own opening markup and is not zero-width.

**C2-A-156** A node whose value is not one contiguous slice of the source omits `pos`. A span over the first piece, or from the first piece to the last, is not an alternative.

**C2-A-157** Such a node may carry `segments`, a list of ranges in the shape of `pos`, one per source piece in order.

**C2-A-158** In a tree a parser built from source, only these node types may omit `pos`: `table_column` and `caption_number`, which have no source text; a `table_row`, a `table_cell`, a `cell_paragraph` and the inline nodes of a cell that a continuation row joined; the cells of a delimited table; and a `text` node merged from pieces that are not adjacent in the source. The final list is open (Open, point 2).

**C2-A-159** A node of a tree that was built or imported without Carve source has no position and omits `pos`. The types `section`, `ruby`, `rubyPair`, `small_caps` and `block_extension` have no source spelling and are never positioned by a parser.

**C2-A-160** A node that a producer has not placed yet is a defect, not a case of C2-A-158.

## Equality

**C2-A-161** Two trees are equal when they agree in node types, in every field this document names, in the order of every node list, in `attrs`, in `metadata` and in `data`, after text coalescing (C2-A-040) and the normalization of C2-A-058.

**C2-A-162** Not compared: `pos`, `segments`, and the resolution results of C2-A-133, a generated heading id included. Each has its own check.

**C2-A-163** Equality compares the tree only. Sidecars and the diagnostics record are not part of it. This replaces the draft sentence that a serializer must preserve source facts: a formatter may normalize any spelling the sidecar holds without changing the document.

**C2-A-164** The round-trip gate is `parse(fmt(x)) == parse(x)` under this equality, for every document `x`. The byte check `fmt(fmt(x)) == fmt(x)` stands beside it.

**C2-A-165** `parse(x)`, encoded to JSON and decoded, equals `parse(x)` in every field, positions included. An encoder that drops a field is not conformant.

**C2-A-166** What a formatter has to keep therefore is what the tree holds: the bullet character, the ordered style, delimiter and start, the spacing, the task mark, the comment form, the citation text, and every other field of the node table.

## Reading a tree

**C2-A-167** Where this document says a reader refuses, it fails with a typed, documented error that names what was wrong and the path of the node. It does not truncate, repair, drop or crash, and it does not surface the error of a JSON library.

**C2-A-168** A reader refuses a root that lacks `type`, `children` or `astVersion`, and a root whose `type` is not `document`.

**C2-A-169** A reader refuses a field the schema does not name, at any node, and neither drops it nor passes it on.

**C2-A-170** A reader refuses a payload that does not validate against `resources/ast-schema.json`, at decode and not in a later step.

**C2-A-171** A reader accepts every tree its own parser can produce at the nesting cap (C2-B-131) and refuses deeper input. It derives its bound from the cap by the worst cost per level of its own encoding.

## Diagnostics

**C2-A-172** A parse, a render and a lint run report into one diagnostics record that sits beside the tree. Nothing in the tree marks a node as diagnosed.

**C2-A-173** Every entry of the record has a `channel`: parse, render loss or lint.

**C2-A-174** The record replaces the separate callbacks, warning lists and render-loss settings of 0.1. The `strictLosses` option turns render-loss entries into errors.

The fields of an entry other than `channel`, and the spelling of the three channel values, are open (Open, point 4).

## Shapes that Carve source cannot spell

**C2-A-175** An interchange-only shape is a node, a field or a wrapper that only a format bridge or another consumer supplies. A parser never produces one, JSON encoding and decoding keep it, and a Carve writer does not invent syntax for it and reports what it could not write.

| Shape | Carve writer | HTML |
| --- | --- | --- |
| `caption.short` | omits the field | renders the full caption once |
| a `table` inside a `figure` | writes the table with its own caption | `figure` around the table |
| blocks in `table_cell.children` | reports the loss | renders the blocks in the cell |
| `small_caps` | writes the children | `span` with class `smallcaps` |
| `section` | writes the children | `section` element |
| `ruby` | writes each base with its annotation in parentheses | `ruby` element |
| an extension node with an unknown name | writes the fallback | renders the fallback |

## Migration

**C2-A-176** Trees of other contract versions are upgraded by a migration function, not by the reader: a 2.0 reader refuses a tree that holds `escaped_text`, `critic_substitution` or `cell_wrap` (C2-A-018).

**C2-A-177** The version string stays `"2.0"`. The `next-ast2` draft never shipped, so its trees have no version of their own: the migration function recognizes a draft tree by those three node types and by the draft fields of the table below.

**C2-A-178** For a tree written by the `next-ast2` draft the migration function does this:

| Draft shape | Becomes |
| --- | --- |
| `critic_substitution` with `old` and `new` | a `delete` holding `old`, directly followed by an `insert` holding `new` |
| `escaped_text` | `text` with the same `value`, then coalesced with its neighbors |
| `cell_wrap` | a `text` node holding one space, then coalesced |
| `cellWraps` on `code`, `math` and `raw_inline` | dropped |
| `rawRef` | dropped; `form` is `collapsed` when it ends in `[]` and `full` otherwise; `key` is folded |
| `key` on definitions and footnote references | folded |
| `attrs.order` and the `keyValues` object | `keyValues` becomes a list of pairs, in the order `attrs.order` gives or else in member order; `order` is dropped; a key named `id` or `class` folds in |
| an `image` in a list of blocks | a `paragraph` with `blockImage: true` that holds the image |
| a `line_block` with block children | `line` children, split at the breaks of each paragraph, with an empty `line` between stanzas; `lines` is dropped |
| a heading id in `attrs.id` | kept as an authored id: the draft tree does not say which ids were generated |
| `marker.bare`, `block_quote.fenced`, `table.sourceFormat` | dropped from the tree; written to a source-layout sidecar when the caller asks for one |
| `thematic_break.marker`, `table.separatorWidths`, `table_row.continuationLines`, `table_cell.sourceContent`, `strong.boldItalic` | dropped |
| a definition inside a container | not produced by the draft, which hoists; no change |

**C2-A-179** A 1.2 tree is first upgraded to the draft shape by the upgrade the draft defines (flat rows to table groups, `items` and `rows` to `children`, `ref` to `key`, `checked` and `taskState` to `task`, and so on) and then migrated as above.

**C2-A-180** The migration is lossy for spelling by design and reports nothing for it. It reports a loss when a tree holds something that 0.2 cannot represent at all.

## Schema changes owed

`resources/ast-schema.json` on `next-ast2` has 86 definitions. This pull request does not edit it. To match this document it changes as follows; after the edit it has 84 definitions.

Definitions removed (4):

1. `escaped_text`.
2. `critic_substitution`.
3. `cell_wrap`.
4. `cellInlineNode`, which existed only to admit `cell_wrap` in a cell.

Definitions added (2):

5. `line`: `type`, inline `children` (required), and the common fields.
6. `documentChild`: a union of `blockNode` plus `footnote`, `link_reference_definition`, `abbreviation_def` and `citation_definition`.

Unions and slots changed (5):

7. `inlineNode`: remove `escaped_text` and `critic_substitution` from the `type` enum and from the `allOf` dispatch.
8. `blockNode`: remove `footnote`, `link_reference_definition`, `abbreviation_def`, `citation_definition` and `image` from the enum and the dispatch.
9. `document.children`: items become `documentChild`.
10. `cell_paragraph.children`: items become `inlineNode`.
11. `line_block.children`: items become `line`.

Fields removed (15):

12. `attrs.order`.
13. `block_quote.fenced`.
14. `listMarker`, ordered branch: `bare`.
15. `thematic_break.marker`.
16. `strong.boldItalic`.
17. `table.separatorWidths`.
18. `table.sourceFormat`.
19. `table_row.continuationLines`.
20. `table_cell.sourceContent`.
21. `code.cellWraps`.
22. `math.cellWraps`.
23. `raw_inline.cellWraps`.
24. `link.rawRef`.
25. `image.rawRef`.
26. `line_block.lines`.

Fields added (3):

27. `heading.generatedId`: string, optional, a resolution result. The draft has no field for it; the name is proposed here.
28. `link.form`: enum `full`, `collapsed`.
29. `image.form`: the same enum.

Types and constraints changed (3):

30. `attrs.keyValues`: from an object with string values to an array whose items are arrays of exactly two strings, the key and the value.
31. `link.dependentRequired` and `image.dependentRequired`: `key` requires `namespace` and `form`, `namespace` requires `key`, `form` requires `key`.
32. `taskState.mark`: no change to the enum; the description states that `X` is recorded as `x`.

Descriptions changed, no shape change (8):

33. `key` on `link`, `image`, `footnote_ref`, `footnote`, `link_reference_definition`, `abbreviation` and `abbreviation_def`: the folded label.
34. `attrs`: fixed order, folding of `id` and `class`; `id` is authored only.
35. `lang` in the common fields: set by the language part of an attribute block.
36. `text`: escapes are part of the value.
37. `pos`: omitted when absent, never null; offsets count original source bytes; the list of types that may omit it.
38. `block_quote`, `table`, `list`: remove the sentences about authored spelling.
39. `image` and `paragraph.blockImage`: one form of block image; remove `rawRef` from the example text.
40. The root description: equality covers the tree only.

Files that follow from the schema: `resources/node-roles.json` is regenerated (the `old` and `new` slots and the `cell_wrap` rule go, `line` is added), and `resources/ast-source-layout-schema.json` changes as `source-layout.md` lists.

## Open

Points the plan or the tracking ticket leaves open. None is decided here. The contradictions found while porting were ruled on 2026-11-13 and are written into the clauses above.

1. **`definition_list.spacing`.** Description lists render as on `main`: a description with one block has a bare paragraph, and one with several blocks wraps every paragraph (C2-B-061). That rule reads the blocks, not `spacing`. Options: (a) `spacing` stays an authored fact as on `main` and only a writer reads it; (b) it is derived, `loose` exactly when some description has more than one block, and becomes a resolution result outside equality; (c) the field is removed. It is settled with the HTML rendering document.
2. **The list of synthesized node types.** C2-A-158 gives the candidates. Not settled: whether the cells of a delimited table can be positioned, and whether table groups always have a position.
3. **The extension API and extension nodes.** How the three stages of the extension API (matcher, transform, renderer) map to `inline_extension` and `block_extension` is not stated. Known so far: the list-table pilot emits core `table` nodes because `block_extension` has no source spelling, and the citation pilot emits the core citation nodes. Options: (a) an extension may only emit core nodes and `inline_extension`; (b) a registered extension may emit qualified extension nodes with a fallback.
4. **The diagnostics record.** Decided: one record, beside the tree, with a channel of parse, render loss or lint. Open: the spelling of the three values, and the other fields of an entry. Candidates: a code, a message, a severity, an RFC 6901 path into the tree, a source range in UTF-8 bytes.
5. **Block-boundary anchors and edit binding** of the annotation-range sidecar (points F2 and F3 of the tracking ticket) are deferred past 0.2.0. The draft text on `next-ast2` (CARVE-P12-062) already describes both; 0.2.0 does not require them.
6. **The gate for this document.** The plan asks for one and states none. A candidate: the schema validates every tree of the corpus, and the position invariants hold with no waiver file.
