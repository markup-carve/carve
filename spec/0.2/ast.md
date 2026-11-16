# Carve 0.2: the AST, contract 2.0

Status: draft on `next2`. The reference engine implements an earlier 2.0 shape.

This document defines the tree a Carve 0.2 parser returns and its JSON form, which one implementation writes and another reads. It is ported from the contract 2.0 draft on the `next-ast2` branch (PART 12 of the 0.1 grammar, clauses CARVE-P12-nnn) and brought in line with the 0.2 syntax. Spelling that the draft kept in the tree lives in the source-layout sidecar, which has its own document (`source-layout.md`).

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-A-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused.
- `C2-B-nnn` and `C2-I-nnn` name clauses of the block and inline chapters, `C2-L-nnn` clauses of the source-layout document.
- The machine-readable form of this contract is `spec/0.2/data/ast-schema.json`. The schema and this document define the same 2.0 contract.
- JSON examples are complete, valid JSON. They leave out `pos` unless the example is about positions.
- A clause that starts with the word "Exception" is a carve-out from a more general clause.
- A *producer* writes a tree, a *reader* ingests one, a *writer* turns a tree into Carve source or another format.
- A *container* is a node that holds blocks: a quote, a list item, a description, a footnote, a div and its named kinds. A list, a description list and a table are not containers; they hold only their own member nodes.
- A *definition* is one of the four top-level definition nodes: a link, footnote, abbreviation or citation definition. The node type `definition_list` is the type of what the prose calls a description list.
- A *comment* is a `comment` node of any of its three forms. An *editorial comment* is a `critic_comment`.
- The *reference form* is the field `refForm` of a link or image written as a reference. The *display form* is the field `display` of an `xref`. The fields have separate names and meanings.
- Where a rule differs from the contract 2.0 draft on `next-ast2`, the section "Migration" says what a draft tree held. The clauses state the rule alone.

## Tree and sidecars

**C2-A-001** The tree holds meaning. A fact is a tree field only when it changes rendered output or a later resolution.

**C2-A-002** Spelling that changes neither is not in the tree. It is recorded in the source-layout sidecar (`source-layout.md`).

**C2-A-003** Source layout, node identity, annotation ranges and provenance are sidecars: each is returned only when the caller asks, validates against its own schema, addresses nodes by RFC 6901 pointers into the tree it came with, and is never placed inside the tree.

**C2-A-004** Two documents that differ only in sidecar content are the same document.

**C2-A-005** Diagnostics are not tree content either: they are one record beside the tree (C2-A-172).

**C2-A-006** The shape defined here is the interchange contract. An implementation whose internal tree differs maps it on output and does not export its internal shape.

**C2-A-007** Node type names and field names are spec surface. An implementation does not invent a synonym and does not publish a field this contract does not name.

## Root, envelope and versions

**C2-A-008** The root is a `document` node with block `children` and `astVersion` in the form `2.MINOR`, where MINOR is a non-negative decimal integer without a leading zero; a 2.0 producer writes `"2.0"`.

**C2-A-009** The root may carry `srcByteLength`, `extensions`, `stages`, `resources` and the common node fields (C2-A-027). No other root field is allowed.

**C2-A-010** `srcByteLength` is the measured number of source bytes, with zero for empty source and absence for unmeasured source. A reader with the source refuses a mismatched value; a reader without the source keeps it as supplied.

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

**C2-A-012** At a storage or process boundary the tree travels inside an envelope with `astVersion` and `document`, and optionally `vocabulary` and `extensions`. An in-memory handoff and `carve --json` use the bare tree. `vocabulary` is an object. An envelope field other than `astVersion`, `document`, `vocabulary` and `extensions` is refused, as an unknown field of a node is (C2-A-169).

**C2-A-013** The envelope and its `document` carry equal `astVersion` strings, and a reader refuses a pair that differs. The envelope does not change the tree.

```json
{
  "astVersion": "2.0",
  "extensions": [{ "name": "org.example.notes", "version": "1", "required": false, "slots": [] }],
  "document": { "type": "document", "astVersion": "2.0", "children": [] }
}
```

**C2-A-014** `astVersion` is `major.minor` and versions this contract, not the language. A leading zero is refused.

**C2-A-015** A major version may remove, rename or reinterpret a field or a node type.

**C2-A-016** A minor version adds only three things: optional declared extensions, extension nodes with a fallback, and namespaced `data`. It adds no core field and no core node type.

**C2-A-017** An extension declaration has a qualified `name`, a boolean `required`, a nonempty `version` and `slots`, an ordered list of distinct slot names. A reader matches the version as an exact string under C2-X-003. If both the root and envelope declare one name, their version, required flag and ordered slots agree.

**C2-A-018** A reader refuses a higher major version, an unknown required extension, an unknown core field, an unknown core node type and an extension node without a valid fallback.

**C2-A-019** A reader accepts every minor version of major 2 that it can read under the additions allowed by C2-A-016.

**C2-A-020** No reader has a degrade-and-report path for an unknown core node type, format bridges included: under C2-A-016 such a type can only come from a broken tree or from another major version.

## Node grammar

**C2-A-021** Every node is a JSON object with a `type` that holds its node type name.

**C2-A-022** `children` is the primary content slot of every node that holds other nodes.

**C2-A-023** `value` is the literal payload of a node that holds text: `text`, `code`, `code_block`, `math`, `raw_block`, `raw_inline`, `literal_inline`, `comment`, `critic_comment` and `frontmatter`.

**C2-A-024** Named child slots are `caption`, `short`, `prefix`, `locator.children`, `suffix`, `pairs`, `base`, `annotation`, `title`, `longDescription`, `columns`, `fallback`, extension `slots`, and the node-bearing metadata keys of C2-A-030 and C2-A-212. Each slot has its content kind and walk order in `spec/0.2/data/node-slots.json` and, for extensions, the tree declaration.

**C2-A-025** A walker visits the slots in `spec/0.2/data/node-slots.json` order, including typed metadata. It visits extension slots in the order of the root or envelope declaration, without a registry. It visits recursive metadata value slots as described by `data/node-slots.json`. It never searches opaque `data` or extension `props` for nodes. Resolution visits `title`, then `children`, then `caption` in source order (C2-L-011). Caption and equation numbers are assigned when their owner is visited (C2-H-170); footnote numbers and ids follow the slot order.

**C2-A-026** `spec/0.2/data/node-slots.json` is generated from `spec/0.2/data/ast-schema.json` and `data/extensions.json`. It names every node-bearing child slot and its walk order.

**C2-A-027** Every typed node may carry the common fields `attrs`, `data`, `pos`, `segments`, `metadata`, `dir` and `lang`, as far as its schema definition allows.

**C2-A-028** Nodes are closed: a field the schema does not name on a node type is an error (C2-A-169). Unknown fields inside `task`, `marker`, a payload alternative or a manifest entry are refused as well.

**C2-A-029** Every `data` key has the qualified grammar of C2-A-123, matches a declaration on the root or envelope, and holds opaque JSON. A reader preserves unknown optional data and refuses a node anywhere inside it.

**C2-A-030** `metadata` is a closed object with optional `title` and `subtitle` inline lists, `authors` as strings, `date` as a string, and `bibliography` as the typed object of C2-A-121. Root metadata also admits `abstract` as blocks, `keywords` as strings, `fields` as named metadata values, and `headers` and `footers`. Each header or footer is a closed object with `placement` set to `default`, `first` or `even` and a `children` slot of blocks. A walker visits every declared metadata slot. Extension `props` is opaque JSON. A reader refuses a node inside `metadata` outside a declared slot or inside `props`.

**C2-A-031** `dir` is `ltr`, `rtl` or `auto`. `dir` and `lang` are inherited from the nearest ancestor that carries them.

### Attributes

**C2-A-032** `attrs` holds the attribute blocks attached to a node: an optional single `id`, an ordered `classes` list and `keyValues`, an ordered list of pairs. Each pair is a list of two strings, the key and its value, and the pairs stand in written order. A bare key has the empty string as its value.

**C2-A-033** The tree records no order between the kinds of parts. The written order is fixed: the id, then the classes as written, then the language, then the keys as written (C2-B-098).

**C2-A-034** A key named `id` or `class`, in any ASCII letter case, is not a member of `keyValues`: it folds into `id` or `classes` when the block is parsed, and of several ids the last one written wins (C2-B-099, C2-B-104).

**C2-A-035** Glued attribute blocks and consecutive attribute lines are merged before the tree is built: classes add up, and a later key replaces an earlier key of the same name (C2-B-093, C2-I-039). Names are the same when they agree without regard to ASCII letter case, within one block as across merged blocks. A key occurs once in `keyValues`, at the place and in the spelling where it was first written, with the value written last.

**C2-A-036** A reader never looks for nodes inside `keyValues`: `{type=widget}` is an ordinary attribute.

**C2-A-037** The language part of an attribute block sets the node field `lang` and is not a key: `{:en}` is the shorthand for `lang: "en"` on the node. A writer puts it after the classes.

**C2-A-038** `attrs.id` holds only an id the author wrote. A generated heading id is not stored there (C2-A-134).

**C2-A-039** `attrs.id` is an anchor in the document. For a duplicate id the first node in document order wins, and the producer reports each later one with the rule `duplicate-id`, whatever the node type.

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

**C2-A-041** A backslash escape is not a node. The escaped character is part of the surrounding `text` value, and a writer computes the escapes it needs.

**C2-A-042** An escaped space is a `non_breaking_space` node with no value. One node stands for one space.

**C2-A-043** Every string field holds literal Unicode. No private-use character has a special meaning, and a temporary marker of a parser or writer is never published.

**C2-A-044** A reader replaces every U+0000 in an ingested string with U+FFFD before it uses the value.

**C2-A-045** `code_block.value` holds every payload character, the final line break included. A closed fence with one line `a` has the value `"a\n"`, and a closed fence with no line has `""`. Container prefixes and fence delimiters are not payload.

**C2-A-046** The value of a parsed fence ends with a line break after its last line, also where the fence is unclosed and the source ends on that line without one: the end of the source counts as a line ending. A producer adds nothing else.

**C2-A-047** A built or imported code block may hold `"a"` with no final break, which is a different value from `"a\n"`. A reader does not append a break.

**C2-A-048** `raw_block.value` follows the same rules as `code_block.value`.

**C2-A-049** `frontmatter` is the first child when present. It carries `format`, which is the word on its opener or `"yaml"` when there is none, and `value`, the text between the delimiters as written, which ends with a line break after its last line also where the block is unclosed and the source ends there without one (C2-A-046). A producer does not publish parsed keys in its place.

## Node types

Contract 2.0 as drafted on `next-ast2` has 75 node types. This document has 74: `escaped_text`, `critic_substitution` and `cell_wrap` are gone, and `line` and `include` are new.

**C2-A-050** The node types are those of the table below. A tree that holds any other core `type` is refused (C2-A-018).

The table is written from the schema. "blocks" and "inlines" mean any block node and any inline node. A field with `?` is optional. The common fields of C2-A-027 are left out.

| Type | Occurs in | `children` | Fields |
| --- | --- | --- | --- |
| `abbreviation` | inline | none | `key`, `namespace`, `expansion`? |
| `abbreviation_def` | top level | none | `expansion`, `key`, `namespace` |
| `admonition` | block | blocks | `kind`, `title`?, `groupLabel`? |
| `autolink` | inline | none | `href`, `text`? |
| `block_extension` | block | blocks | `name`, `version`, `props`?, `slots`?, `fallback`, `payload`?, `resourceIds`?, `source`? |
| `block_quote` | block | blocks | none |
| `caption` | `caption` slot | blocks | `short`? |
| `caption_number` | inline | none | `n`? |
| `cell_paragraph` | `table_cell` | inlines | none |
| `citation` | `citation_group` | none | `key`, `prefix`?, `locator`?, `suffix`?, `mode`?, `number`?, `useIndex`?, `namespace` |
| `citation_definition` | top level | inlines | `key`, `namespace`, `metadata`? |
| `citation_group` | inline | `citation` | `raw` |
| `code` | inline | none | `value` |
| `code_block` | block | none | `value`, `syntax`?, `title`?, `groupLabel`? |
| `comment` | block, inline | none | `form`, `value` |
| `critic_comment` | inline | none | `value` |
| `definition_description` | `definition_list` | blocks | none |
| `definition_list` | block | `definition_term`, `definition_description`, `comment` | none |
| `definition_term` | `definition_list` | inlines | none |
| `delete` | inline | inlines | none |
| `directive` | block | blocks | `kind`, `title`?, `groupLabel`?, `tocTarget`? |
| `div` | block | blocks | `title`?, `groupLabel`? |
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
| `image` | inline | none | `src`?, `alt`?, `decorative`?, `tooltip`?, `targetKind`?, `key`?, `namespace`?, `resourceId`?, `refForm`?, `longDescription`? |
| `include` | block | none | `path`, `section`?, `options`? |
| `inline_extension` | inline | inlines | `name`, `version`?, `props`?, `slots`?, `fallback`?, `payload`?, `resourceIds`?, `source`? |
| `inline_footnote` | inline | inlines | `number`? |
| `insert` | inline | inlines | none |
| `line` | `line_block` | inlines | none |
| `line_block` | block | `line` | none |
| `link` | inline | inlines | `href`?, `tooltip`?, `targetKind`?, `key`?, `namespace`?, `refForm`? |
| `link_reference_definition` | top level | none | `href`, `tooltip`?, `key`, `namespace` |
| `list` | block | `list_item` | `marker`, `spacing` |
| `list_item` | `list` | blocks | `task`? |
| `literal_inline` | inline | none | `value` |
| `math` | inline | none | `display`, `number`?, `value`, `numberPrefix`? |
| `mention` | inline | none | `target`, `kind`, `label`? |
| `non_breaking_space` | inline | none | none |
| `paragraph` | block | inlines | `role`? |
| `raw_block` | block | none | `format`, `value` |
| `raw_inline` | inline | none | `format`, `value` |
| `ruby` | inline | none | `pairs` |
| `ruby_pair` | `ruby.pairs` | none | `base`, `annotation` |
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
| `table` | block | table groups, `comment` | `columns`, `caption`? |
| `table_body` | `table` | `table_row`, `comment` | `headRows`?, `rowHeadColumns`? |
| `table_cell` | `table_row` | blocks, `cell_paragraph` | `header`, `span`?, `colspan`?, `rowspan`?, `align`?, `valign`?, `scope`?, `headerIds`? |
| `table_column` | `table.columns` | none | `align`?, `valign`?, `width`?, `resolvedAlign`?, `authored`? |
| `table_foot` | `table` | `table_row`, `comment` | none |
| `table_head` | `table` | `table_row`, `comment` | none |
| `table_row` | table group | `table_cell` | none |
| `tag` | inline | none | `name` |
| `text` | inline | none | `value` |
| `thematic_break` | block | none | none |
| `underline` | inline | inlines | none |
| `xref` | inline | none | `href`?, `key`, `namespace`, `display`? |

**C2-A-051** A list of blocks admits only content blocks. A type that exists only inside its container (`list_item`, `definition_term`, `definition_description`, `line`, the table groups, `table_row`, `table_cell`, `cell_paragraph`, `caption`, `citation`, `ruby_pair`, `table_column`) is refused anywhere else.

**C2-A-052** `footnote`, `link_reference_definition`, `abbreviation_def` and `citation_definition` occur only in `document.children`, because a definition stands at the top level (C2-B-081). Each stands at its place in source order among the other blocks; no definition is moved or collected. A reader refuses one inside a container.

## Blocks

### Lists and tasks

**C2-A-053** A `list` carries `children` of `list_item` nodes, one `marker` object and `spacing`.

**C2-A-054** A bullet marker is `{"kind": "bullet", "char": c}` where `c` is `-` or `*`.

**C2-A-055** `marker.char` is meaning: an item with the other character starts another list (C2-B-035).

**C2-A-056** An ordered marker has `kind: "ordered"` and may carry `style` (`1`, `a`, `A`, `i` or `I`), `delimiter` (`.` or `)`) and `start`. Whether the author wrote numbers or the bare dot is spelling and is not in the marker.

**C2-A-057** A marker that carries fields of both kinds is invalid.

**C2-A-058** `marker.start` is omitted when it is 1, and a reader refuses `start: 1` in a supplied tree instead of normalizing it.

**C2-A-059** `list.spacing` is `tight` or `loose` and is set when the list closes (C2-B-062). No list attribute overrides it.

**C2-A-060** A task item carries `task`, a closed object with only `mark`. `mark` is one of the eight characters space, `x`, `_`, `-`, `/`, `!`, `>` and `?`; a parsed `X` becomes `x`.

**C2-A-061** A consumer derives task status from `mark` using `data/task-states.json`; `status` is never stored in the 2.0 tree. This replaces the earlier draft pair of `mark` and `status`.

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

**C2-A-062** A `definition_list` holds `definition_term`, `definition_description` and source `comment` nodes in document order. A term holds inlines and a description holds blocks.

**C2-A-063** The grouping of terms and descriptions is not published. A run of terms belongs to the descriptions that follow it.

**C2-A-064** A `definition_list` has no `spacing` field. A renderer reads the blocks of each description (C2-B-073, C2-B-077).

### Quotes, divs and their sigil forms

**C2-A-065** A quote is a `block_quote` with block `children`, whether it was written with `>` lines or as a quote fence. Which of the two the author wrote is not in the tree.

**C2-A-066** The opener of a div decides its node type. A name from `note`, `tip`, `warning`, `danger`, `info`, `success`, `example` and `quote` gives an `admonition` of that `kind`. A name from `bibliography`, `footnotes`, `glossary`, `index`, `references` and `toc` gives a `directive`. The name `figure` with no title and no label gives a `figure_group`, and with one of them a `div` whose first class is `figure` (C2-B-127). Any other name gives a `div` whose first class is the name. An opener with no name gives a `div`.

**C2-A-067** A `directive` always carries `children` and may carry a `title` and `tocTarget` (`headings`, `figures`, `tables` or `listings`).

**C2-A-068** A hard-break block is not a node type and not a field. It is a `div` with the class `hardbreaks` in which every line end is a `hard_break` node. The opener form adds the class after the classes the author wrote, so it comes last in `attrs.classes`; the class form has it where it was written. The two forms give the same tree when `hardbreaks` is the last class. Which form the author wrote is in the sidecar.

**C2-A-069** A line block is a `line_block` whose `children` are `line` nodes, one per line of its body in order. A `line` holds inline `children`. An empty line of the body is a `line` with no children, and it ends a stanza. A line that holds only a braced comment is a `line` that holds the comment.

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

**C2-A-070** A `heading` carries `level` and inline `children`, which hold a `soft_break` or a `hard_break` where the heading continues on a further line (C2-B-154). The marker character is not recorded in the tree, and the formatter writes `=`.

**C2-A-071** `heading.level` is an integer of at least 1, and a reader refuses a smaller value. Carve source gives 1 to 6, and an imported tree may hold more (C2-H-021).

**C2-A-072** A `thematic_break` has no fields of its own: 0.2 has one spelling, the star run.

**C2-A-073** A `code_block` carries `value` and may carry `syntax`, the language word, and `title`, a list of inlines. A parsed `title` is one `text` node that holds the quoted value read as in C2-I-033; it is not inline-parsed, so `"src/*a*"` gives the text `src/*a*`. The fence character and the fence length are not in the tree.

### Comments

**C2-A-074** A `comment` carries `value` and `form`, which is `block` for a `%%%` block, `line` for a `%%` comment and `braced` for `{% %}`. `form` is meaning: a line comment and a comment block read differently when the source is parsed again. `value` of a line comment is its text without the one space that follows `%%`, when there is one, and without spaces and tabs at its end, also where the comment ends at the pipe of a cell (C2-B-134); `value` of a braced comment is its text without the one space after `{%` and the one space before `%}`, when there are such spaces; `value` of a block comment is its body, with a line break between two lines and none after the last.

**C2-A-075** The comment of a comment-only line is a child of the open leaf when one is open, and otherwise of the innermost open container, at its place in source order (C2-B-138).

### Definitions

**C2-A-076** A definition is a child of the document and nothing else: a definition-shaped line inside a container is text (C2-B-081), so no definition is moved out of a container and no position rule covers that case.

**C2-A-077** A `link_reference_definition` carries a folded `key` (C2-A-104), `namespace: "link"`, `href` and optional `tooltip`. A parsed tree never holds an empty `href`; a supplied one is unspellable and the Carve writer reports it.

**C2-A-078** A `footnote` carries `key`, `namespace: "footnote"` and block `children`.

**C2-A-079** An `abbreviation_def` carries `key`, `namespace: "abbr"` and `expansion`.

**C2-A-080** Definitions are nodes with a position, so document order decides which of two definitions wins: the first one (C2-B-085).

### Figures and captions

**C2-A-081** A caption is a `caption` node with block `children` and an optional inline `short`. A producer does not derive `short` from the full caption.

**C2-A-082** In 0.2 a caption attaches to an image, a table, a code block, a quote, a math block or a figure group (C2-B-147). A table carries its caption in its own `caption` slot. An image, a code block, a quote and a math block are wrapped in a `figure` that carries the caption. The comment of a comment-only line between a block and its caption (C2-B-137) is a child of that `figure`, after the block; below a block image or a math block it is a child of that paragraph, which is still open when the comment is read (C2-A-136, C2-A-184); for a figure group it is the last child of the group; and for a table it is the last child of the table, so that no sibling lies inside another's span (C2-A-145).

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

**C2-A-086** A `table` carries `children` that are `table_head`, `table_body` and `table_foot` nodes, and after them the comment of a comment-only line that stands below the last row and not before a continuation of that row, with or without a caption below it (C2-A-082). Each group holds `table_row` nodes and each row holds `table_cell` nodes. There is no flat row list and no count object. The comment of a comment-only line between two rows (C2-B-137) is a `comment` node among the rows of its group, at its place in source order. It belongs to the group of the row above it, so a comment between the last head row and the first body row is the last child of the head. A `table_head` and a `table_foot` admit a `comment` among their rows as a `table_body` does. The trailing line comment of a row (C2-B-167) is a `comment` node at the place that a comment-only line directly below that row would take: among the rows of the row's group, directly after the row, or, after the last row of the table, as the comment after the groups. The row then ends at its closing pipe or its row attribute, and the comment spans from the first space before its `%%` to the line ending (C2-A-151). For `| 1 | 2 | %% note`, a line feed and `| 3 | 4 |`, the body holds the first row, the comment `note` and the second row, and the first row spans offsets 0 to 9. A comment between a row and its continuation row (C2-B-175), as a comment-only line or as the trailing comment of the row, belongs to the row's group, directly after the row, because the continuation is part of that row (C2-B-184); a continued row has no `pos` (C2-A-158), so the comment overlaps no sibling. For `| a |`, `%% x` and `+ b |` on three lines, the body holds the row `a b` and then the comment `x`, and the table holds no comment after its groups.

**C2-A-087** A table whose source declares no grouping has a head made of its leading rows that hold only header cells, and one body for the rest (C2-B-178).

**C2-A-088** A `table_body` whose partition the source declared carries `headRows`, also when the value is 0. A body the producer inferred omits it. The presence of the field is a tree fact and takes part in equality.

**C2-A-089** A table has `columns` of `table_column` nodes. Each column keeps authored `align` beside result `resolvedAlign`; it may also hold `valign`, `width` and `authored` (C2-B-211 to C2-B-213). `resolvedAlign` is the mark of the last head cell of that column (C2-B-182), or else the authored `align` from the `aligns` attribute (C2-B-213). A cell mark overrides the resolved column alignment for that cell.

**C2-A-090** `table_column.authored` is `true` on a column the source spelled, which is one that `aligns` or `widths` gives a value, and absent on one the producer inferred. It is a tree fact and takes part in equality.

**C2-A-091** `table_cell.children` is always a list of blocks. A cell written in a pipe table holds one `cell_paragraph` with inline `children`, which renders without a paragraph element. An imported cell may hold other blocks.

**C2-A-092** A cell carries `header` and may carry authored `span`, resolved `colspan` and `rowspan`, `align`, `valign`, `scope` and `headerIds`. Each present count is an integer of at least 1, and a reader refuses a smaller value. `valign` is one of `top`, `middle`, `bottom` and `baseline`, and a reader refuses another value. `scope` is one of `row`, `col`, `rowgroup` and `colgroup`; `headerIds` is an ordered list of `attrs.id` values of header cells, and a reader refuses a missing or nonheader target. A parse of Carve source produces neither accessibility field. A failed span mark leaves an ordinary cell; a valid mark cell stays empty and unpositioned while the covering cell carries the count (C2-B-173).

**C2-A-093** A supplied count that contradicts an authored `span` mark is refused; a parser derives counts from marks according to C2-B-173. The mark decides the effective span, and counts without a mark describe an imported span. Column `align` is authored and `resolvedAlign` is derived under C2-A-089 and C2-B-213.

**C2-A-094** A continuation row leaves no node and no field. Its fragments join the cell above with one space before the cell's inline content is read (C2-B-184), and that space is ordinary text; inside a node whose value is its source the join is a line feed (C2-B-184). Where the row broke is spelling and is in the sidecar.

**C2-A-095** A table has no field for the widths of a separator row, since 0.2 has no such row; no field for the kind of source content of a cell, since `cell_paragraph` says it; and no field for whether it was written as a pipe table or a delimited table, which is spelling.

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

**C2-A-096** `emphasis` and `strong` nest in the order written. There is no combined token and no field for one.

**C2-A-097** A replacement is a `delete` node directly followed by an `insert` node (C2-I-062). There is no `critic_substitution` node.

```json
{
  "type": "paragraph",
  "children": [
    { "type": "delete", "children": [{ "type": "text", "value": "old" }] },
    { "type": "insert", "children": [{ "type": "text", "value": "new" }] }
  ]
}
```

**C2-A-098** A `smart_punctuation` node carries `kind` and `source`, the characters as typed, and may carry `glyph`. `source` stays in the tree, because a renderer with `smartTypography` off prints it. The `kind` of a smart punctuation node is one of the kinds of `data/smart-punctuation.json`; a reader refuses any other value.

**C2-A-099** A line break inside a leaf is a `soft_break` or a `hard_break`. Neither has a value.

**C2-A-100** An `inline_footnote` holds its content in `children` and may carry `number` as a resolution result.

**C2-A-101** A `mention` carries `kind`, `target` and an optional visible `label`. Parsing `@name` gives the `kind` `user`, the name as `target` and no `label`; another kind and a label come from an extension or a supplied tree. A `tag` and a `symbol` carry `name`.

**C2-A-102** A `math` node carries `value` and `display`. A display equation may carry result `number` only together with `numberPrefix`, and a reader refuses either field alone.

### References

**C2-A-103** A reference use and a definition carry `key` and `namespace` together. The namespaces are `link`, `footnote`, `citation`, `abbr` and `heading`. A direct link or image carries neither.

**C2-A-104** `key` is the folded label: every run of spaces, tabs and line breaks becomes one space, the ends are trimmed, and case is kept (C2-I-079). Uses and definitions fold the same way, so two keys match when they are equal strings.

**C2-A-105** A reference `link` or `image` carries `refForm`, `full`, `collapsed` or `shortcut`, exactly when it carries `key`. This field records reference spelling separately from cross-reference display. The verbatim text is in the sidecar.

**C2-A-106** The tree is pre-resolve. A resolution result is added beside the authored construct and never replaces it.

**C2-A-107** On a reference use an absent `href` or `src` means unresolved, and the empty string means a destination that is empty. There is no `resolved` field.

**C2-A-108** An unresolved full or collapsed reference remains a `link` or `image` with its `children` or `alt`, `key`, `refForm` and `attrs`; it never becomes text. HTML renders its brackets and label as literal text. A shortcut forms only for a defined key and is therefore never unresolved when parsed from source.

**C2-A-109** A link reference is looked up in the link definitions first and then in the headings (C2-I-081, C2-I-083, C2-I-084). The heading lookup applies to link references only, not to images and not to footnotes. It compares plain text that the tree alone gives, so it needs no source. Its result is an `href` on the link, like any other resolution.

**C2-A-110** A trailing attribute block on a reference is ordinary `attrs`, resolved or not. The reference node keeps only its own authored attributes. The merge with the attributes of its link definition (the classes of the definition first, then the reference's; the id and the keys of the reference win) is a resolution result: it is not written into `attrs` and takes no part in equality.

```json
{
  "type": "link",
  "key": "getting started",
  "namespace": "link",
  "refForm": "collapsed",
  "children": [{ "type": "text", "value": "getting started" }]
}
```

**C2-A-111** A link or an autolink inside link text stays a node in the tree. A renderer unwraps it.

**C2-A-112** `href`, `src` and every other destination hold what the author wrote. A producer does not blank or rewrite a destination on the way into the tree.

**C2-A-113** A consumer that puts a destination into a URL sink applies the URL policy itself. The tree may hold `javascript:alert(1)`.

**C2-A-114** A link or image may carry `targetKind` (`url`, `wiki`, `doc` or `xref`) for a target that is not a URL.

**C2-A-115** An `image` may carry `alt`, `decorative`, `tooltip`, `resourceId` and `longDescription`, a list of blocks. `decorative: true` requires `alt` to be absent, and an absent `alt` requires `decorative: true`; a reader refuses either contradictory pair. A parse of Carve source produces no `longDescription` or `decorative` field. A resolved reference takes its tooltip from its definition.

**C2-A-116** An `xref` carries `key`, `namespace`, and optional `display` (`number`, `page`, `title` or `full`); resolution may add `href`. The `display` field records cross-reference display separately from reference spelling. A Carve writer reports `display` as unspellable (C2-I-096).

**C2-A-117** A `footnote_ref` carries `key` and `namespace: "footnote"`, and `number` once resolved. An `abbreviation` carries `key` and `namespace: "abbr"`, and may carry `expansion`.

### Citations

**C2-A-118** A `citation_group` carries `children` of `citation` nodes and `raw`. A `citation` occurs nowhere else.

**C2-A-119** `citation_group.raw` is the bracket text as written. It stays in the tree, because it is what renders when a key has no entry. Core has no citation spelling (C2-I-101): where no extension handles citations, HTML writes `raw` as text and a `citation_definition` writes nothing, and a Carve writer writes `raw` and reports `structure-unspellable` for a `citation_definition`.

**C2-A-120** A citation item has optional `mode` from the closed set `normal`, `author-in-text` and `suppress-author`, matching the three Pandoc citation modes; absence means `normal`. A group has no mode, and an item has no separate author-suppression flag. A locator is one object with optional string `label` and required inline `children`; the earlier `locatorLabel` and `locatorValue` fields are refused.

**C2-A-121** A `citation_definition` carries `key`, `namespace: "citation"`, inline `children` and optional typed `metadata.bibliography`, not bibliographic attributes. Bibliography may hold `title` and `containerTitle` as inline lists, `authors` as a list of strings, and `issued`, `doi` and `url` as strings; other keys are refused. This replaces the earlier draft use of `attrs` for bibliography facts.

## Extension nodes, foreign data and resources

**C2-A-122** `block_extension` and `inline_extension` carry `name`, a version for qualified names, opaque JSON `props`, `children`, optional named `slots`, a fallback for qualified names, optional `payload`, and optional `source` under C2-X-024. Each payload alternative has exactly nonempty string `format` and non-null JSON `value`; unknown fields are refused. The 8 MiB limit of C2-A-132 counts a string value in UTF-8 bytes and another value in UTF-8 JSON bytes. This replaces the earlier version and source-field shape.

**C2-A-123** A qualified name has the grammar `namespace.name`, with each segment matching `[A-Za-z][A-Za-z0-9_-]*` and one or more dot-separated namespace segments. A qualified extension node is declared by the full name on the root or envelope and carries a same-role fallback, whether it is inline or block. This closes the earlier draft dot-only test.

**C2-A-124** A name without a dot is the name of an inline extension written in Carve source when no declared matcher claims it. `:kbd[Ctrl]` gives `"name": "kbd"`, needs no declaration, and its `children` are its fallback. A matcher may transform that core node to a qualified extension under C2-X-006.

**C2-A-125** A `block_extension` has a qualified name and a mandatory fallback. A 0.2.0 transform may produce one from a core div or code block under C2-X-008 to C2-X-011. This replaces the earlier phase 6 deferral and the prohibition on produced block extensions.

**C2-A-126** A qualified extension fallback is core content of the node's own role, block or inline. It contains no extension node and validates as core content.

**C2-A-127** An unknown optional extension renders through its fallback and is reported as a loss. An unknown required extension is refused.

**C2-A-128** Reading a tree never runs anything in `payload`, `props` or `data`. An application enables active content only through a separate capability outside this contract.

```json
{
  "type": "inline_extension",
  "name": "kbd",
  "children": [{ "type": "text", "value": "Ctrl" }]
}
```

**C2-A-129** A foreign construct with a core equivalent maps to core nodes. One without may be carried in declared `data` or in an extension with a fallback. A writer that cannot carry it reports the loss with its JSON path.

**C2-A-130** The contract promises semantic interchange. It does not promise an editable round trip for a foreign format, and it does not promise that source spelling survives in the tree.

**C2-A-131** `document.resources` is a manifest of closed entries with `id`, `mediaType`, `digest` in `sha256:` plus 64 lowercase hex digits, and optional `href` and `size`. `size` is a non-negative integer of bytes. A missing or duplicate referenced id is refused; unknown entry fields are refused rather than kept. This closes the earlier draft open entry shape.

**C2-A-132** A reader bounds a decoded extension payload to 8 MiB per node, metadata value nesting to 64 levels, resource references to 4096 per tree and fallback nesting to 32 unqualified inline extension nodes, and refuses an excess.

## Resolution results

**C2-A-133** Resolution results remain in the tree beside authored fields. `spec/0.2/data/ast-results.json` is the complete per-type list of result fields, including generated ids, resolved destinations, numbers, alignment, derived span counts and root `stages`.

**C2-A-134** A generated heading id is a resolution result. It is published in the heading field `generatedId` and never in `attrs.id`. The `headingIds` option is `off`, `keep-case`, `lower` or `ascii`, and `keep-case` is the default; with `off` no `generatedId` is produced, and an authored id stays.

**C2-A-135** The root `stages` list names the resolution stages that ran: `referenceResolution` and `tableAlignment`. A producer names a stage only when its results are complete.

**C2-A-136** A block image is a `paragraph` containing one `image` and any following comment-only lines, with `role: "image"`. A parser sets the role on close (C2-B-157, C2-B-191), and an ordinary paragraph omits it. A wrapped reference label that covers two lines remains ordinary (C2-B-197). The `role` is a tree fact used by equality.

**C2-A-137** The formatter writes the source spelling of a promoted paragraph, so promotion does not show in its output.

## Positions

**C2-A-138** Every node of a tree that a parser built from source carries `pos`, except the root and the node types of C2-A-158. A parser builds positions unless the caller asks for a tree without them; a tree built that way omits `pos` on every node and is otherwise the same. Rendering from source needs no positions and builds none, unless `sourceLines` is on.

**C2-A-139** A node that has no position omits `pos`. `pos` is never `null`, and a producer never invents a range.

**C2-A-140** `pos` has six required integers: `startLine`, `endLine`, `startColumn`, `endColumn`, `startOffset` and `endOffset`.

**C2-A-141** Lines and columns start at 1, offsets start at 0, and a reader refuses a smaller value. Columns count Unicode code points, offsets count original UTF-8 bytes, and ends are exclusive.

**C2-A-142** `pos.file`, when present, is a string id of the included input whose coordinates are measured. Absence means the top-level input; positions in different files are never compared.

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

**C2-A-145** Siblings are ordered and disjoint: for two nodes `a` before `b` in one node list, `a.endOffset` is not greater than `b.startOffset`. Nodes without `pos` are skipped. One case is exempt: the comment of a comment-only line that stands between an attribute line and the block that takes it (C2-B-137) lies inside the span of that block (C2-A-148) and is its sibling before it.

**Exception C2-A-146** Two breaks that meet at one line ending share it, against C2-A-145.

**C2-A-147** A comment that came from a comment-only line satisfies C2-A-144 and C2-A-145 in the node list C2-A-075 puts it in: the open leaf, or else the innermost open container.

**C2-A-148** A span starts at the markup that opens the construct: the quote mark, the heading marker, the list marker, the colon run of a div, the opening bracket of a link, the backtick run of a fence. Leading indent on the opening line is outside the span, of a container as of a leaf: in ` > a` the quote starts at its mark, offset 1. A block that took attribute lines (C2-B-091) starts at the first of them. Where the attribute lines go to a `figure` (C2-B-107), the figure starts at the first of them and the block inside it starts at its own opening markup.

**Exception C2-A-149** A table cell does not start at its opening markup, against C2-A-148: it spans the text between its pipes.

**C2-A-150** No span starts at a line ending, except the span of a `soft_break` or a `hard_break`.

**C2-A-151** A span ends directly after the last source character the construct owns. A closing delimiter and an attached attribute block are inside; a following line ending, a blank line and an attribute line that attached to nothing are outside. The spaces and tabs at the end of a line always have an owner. At the end of a block's last line they belong to the block, which ends at the line ending, an include and a heading as every other block; the padding of a cell belongs to the cell (C2-A-149). Inside a content they belong to the node that drops them (C2-I-002), on the last line of the content as on the others: to a line comment at the end of the line, which starts at the first space or tab before its `%%` and ends at the line ending, and otherwise to the break that follows them (C2-A-153). A node that holds text ends after its last kept character. For `a %% x`, two spaces, a line feed and `b`, the paragraph spans offsets 0 to 10, the comment 1 to 8 and the soft break 8 to 9; for `{{ a.crv }}` and two spaces, the include spans 0 to 13.

**C2-A-152** A break owns its line ending, so its end is column 1 of the next line. A hard break also spans its backslash. A hard break at the end of the content with no line ending after it, as at the end of a table cell (C2-I-102), spans its backslash only.

**C2-A-153** A break that a parser makes from a plain line ending, with no backslash in the source, has a span: the spaces and tabs that C2-I-002 drops before the line ending and no line comment owns (C2-A-151), and the line ending itself. It starts directly after the last kept character of its line, so for `a`, two spaces, a line feed and `b` the soft break spans offsets 1 to 4. A hard break spans the same and its backslash (C2-A-152). It is not among the nodes that omit `pos`.

**C2-A-154** A container, a list, a description list and a table end after their closer when they have one, and otherwise after their last child that has a position. Each starts at its opening markup and ends at its closing markup also when its first or last child has no position.

**C2-A-155** A container with no positioned child spans its own opening markup and is not zero-width.

**C2-A-156** A node whose value is not one contiguous slice of the source omits `pos`. A span over the first piece, or from the first piece to the last, is not an alternative.

**C2-A-157** Such a node may carry `segments`, a list of ranges in the shape of `pos`, one per source piece in order.

**C2-A-158** In a tree a parser built from source, a node omits `pos` only when it has no source character or when its value is not one contiguous slice of the source (C2-A-156). Nodes with no source character are `table_column` and the `cell_paragraph` of an empty cell. Nodes that are not one slice are a `table_row`, a `table_cell` and a `cell_paragraph` that a continuation row joined, an inline node of such a cell that takes characters from more than one of its pieces, the delimited table cases of C2-A-215, and a `text` node merged from pieces that are not adjacent in the source. Every other node carries `pos`. An empty cell and a cell that holds a span mark span the text between their pipes (C2-A-149), so in `| a | |` the second cell spans offsets 5 to 6. A `caption_number` spans its `#`, and the text on each side of it spans its own characters: for `![i](a.png)`, a line feed and `^ Figure #: cap`, the text `Figure ` spans offsets 14 to 21, the number 21 to 22 and the text `: cap` 22 to 27.

**C2-A-159** A node of a tree that was built or imported without Carve source has no position and omits `pos`. The types `section`, `ruby`, `ruby_pair` and `small_caps` have no source spelling and are never positioned by a parser. A block extension transformed from source takes the claimed core node's position.

**C2-A-160** A node that a producer has not placed yet is a defect, not a case of C2-A-158.

## Equality

**C2-A-161** Two trees are equal when their node types, fields, node-list order, `attrs`, typed `metadata` and opaque `data` agree after text coalescing (C2-A-040), except the fields listed in `spec/0.2/data/ast-results.json` and source geometry in C2-A-162.

**C2-A-162** Equality skips `pos`, `segments`, `srcByteLength`, and exactly the resolution fields listed in `spec/0.2/data/ast-results.json`; a span count is skipped only when derived from an authored mark. `paragraph.role` is compared (C2-A-136).

**C2-A-163** Equality compares the tree only. Sidecars and the diagnostics record are not part of it, so a formatter may normalize any spelling the sidecar holds without changing the document.

**C2-A-164** The round-trip gate is `parse(fmt(x)) == parse(x)` under this equality, for every document `x`. The byte check `fmt(fmt(x)) == fmt(x)` stands beside it.

**C2-A-165** `parse(x)`, encoded to JSON and decoded, equals `parse(x)` in every field, positions included. An encoder that drops a field is not conformant.

**C2-A-166** What a formatter has to keep therefore is what the tree holds: the bullet character, the ordered style, delimiter and start, the spacing, the task mark, the comment form, the citation text, and every other field of the node table.

## Reading a tree

**C2-A-167** Where this document says a reader refuses, it fails with a typed, documented error that names what was wrong and the path of the node. It does not truncate, repair, drop or crash, and it does not surface the error of a JSON library.

**C2-A-168** A reader refuses a root that lacks `type`, `children` or `astVersion`, and a root whose `type` is not `document`.

**C2-A-169** A reader refuses a field the schema does not name, at any node, and neither drops it nor passes it on.

**C2-A-170** A reader validates a tree against `spec/0.2/data/ast-schema.json` at decode and refuses a failure. The files under `resources/` describe the 0.1 contract.

**C2-A-171** A reader accepts every tree its own parser can produce at the two nesting limits, 200 blocks (C2-B-190) and 200 inline levels in each inline content (C2-I-118), and refuses deeper input. It derives its bound from the limits by the worst cost per level of its own encoding.

## Diagnostics

**C2-A-172** A parse, a render, a write and a lint run report into one diagnostics record that sits beside the tree. Nothing in the tree marks a node as diagnosed.

**C2-A-173** Every entry of the record has a code, a severity, a position, a message and a channel (C2-W-103). The channel is `parse`, `render-loss` or `lint`, and a code belongs to one channel (C2-W-104). The position is an optional range in UTF-8 bytes and an optional RFC 6901 path into the tree, so a finding on a tree with no source has the path alone.

**C2-A-174** The record replaces the separate callbacks, warning lists and render-loss settings of 0.1. The `strictLosses` option turns render-loss entries into errors.

## Shapes that Carve source cannot spell

**C2-A-175** An interchange-only shape is a node, a field or a wrapper that only a format bridge or another consumer supplies. A parser never produces one, JSON encoding and decoding keep it, and a Carve writer does not invent syntax for it and reports what it could not write.

| Shape | Carve writer | HTML |
| --- | --- | --- |
| `caption.short` | omits the field | renders the full caption once |
| `table_cell.scope` and `headerIds` | reports each field | writes `scope` and `headers` attributes |
| `image.longDescription` | reports the field | renders its blocks after the image |
| `image.decorative` | reports the field | writes empty `alt` |
| `xref.display` | reports the field | uses the default core text |
| a `table` inside a `figure` | writes the table with its own caption | `figure` around the table |
| blocks in `table_cell.children` | reports the loss | renders the blocks in the cell |
| `small_caps` | writes the children | `span` with class `smallcaps` |
| `section` | writes the children | `section` element |
| `ruby` | writes each base with its annotation in parentheses | `ruby` element |
| an extension node with an unknown name | writes the fallback | renders the fallback |

## Migration

**C2-A-176** Trees of other contract versions are upgraded by a migration function, not by the reader: a 2.0 reader refuses a tree that holds `escaped_text`, `critic_substitution` or `cell_wrap` (C2-A-018).

**C2-A-177** A 2.0 producer writes `"2.0"`. The `next-ast2` draft never shipped. A migration function recognizes its tree or an earlier 0.2 draft tree by the retired node types and fields in the table below.

**C2-A-178** For a tree written by `next-ast2` or an earlier 0.2 draft the migration function applies the matching rows:

| Draft shape | Becomes |
| --- | --- |
| `critic_substitution` with `old` and `new` | a `delete` holding `old`, directly followed by an `insert` holding `new` |
| `escaped_text` | `text` with the same `value`, then coalesced with its neighbors |
| `cell_wrap` | a `text` node holding one space, then coalesced |
| `cellWraps` on `code`, `math` and `raw_inline` | dropped |
| `rawRef` | dropped; 0.1 references become `collapsed` when `rawRef` ends in `[]` and `full` otherwise; 0.1 has no `shortcut` form; `key` is folded |
| `key` on definitions and footnote references | folded |
| `attrs.order` and the `keyValues` object | `keyValues` becomes a list of pairs, in the order `attrs.order` gives or else in member order; `order` is dropped; a key named `id` or `class` folds in |
| an `image` in a list of blocks | a `paragraph` with `role: "image"` that holds the image |
| a `line_block` with block children | `line` children, split at the breaks of each paragraph, with an empty `line` between stanzas; `lines` is dropped |
| a heading id in `attrs.id` | kept as an authored id: the draft tree does not say which ids were generated |
| `marker.bare`, `block_quote.fenced`, `table.sourceFormat` | dropped from the tree; written to a source-layout sidecar when the caller asks for one |
| `definition_list.spacing` | dropped |
| the former image promotion stage | dropped; `role: "image"` stays as the tree has it |
| the task status `cancelled`, in a draft tree or a 1.2 tree | removed; status derives from the mark |
| the former reference spelling field on links and images | `refForm`; the name identifies reference spelling rather than xref display. |
| the former cross-reference display field | `display`; the name identifies generated display text rather than reference spelling. |
| the former string tooltip field on link reference definitions | `tooltip`; all link target strings use one name, while visible titles stay inline lists. |
| the former image and math promotion flags on paragraphs | `role: "image"` and `role: "math"`; one field makes the two exclusive. |
| the former camel-case ruby pair node type | `ruby_pair`; the type follows snake_case and carries common node fields. |
| the former citation author-suppression flag | `citation.mode: "suppress-author"`; one field determines the mode. |
| `citation_group.mode` | removed; every item carries its own mode. |
| `citation.locatorLabel` and `citation.locatorValue` | `locator` object with label and inline children; its parts cannot disagree. |
| the former stored task state | removed; the state derives from `task.mark`. |
| `include.options` string pairs | decoded typed option object; source quoting moves to layout. |
| `thematic_break.marker`, `table.separatorWidths`, `table_row.continuationLines`, `table_cell.sourceContent`, `strong.boldItalic` | dropped |
| a definition inside a container | not produced by the draft, which moves it to the document; no change |
| a named `admonition` whose `kind` is not one of the eight admonition names | a `div` with the name as its first class |

**C2-A-179** A 1.2 tree is first upgraded to the draft shape by the upgrade the draft defines (flat rows to table groups, `items` and `rows` to `children`, `ref` to `key`, `checked` and `taskState` to `task`, and so on) and then migrated as above.

**C2-A-180** The migration is lossy for spelling by design and reports nothing for it. It reports a loss when a tree holds something that 0.2 cannot represent at all.

## Later clauses

These clauses were added after other documents began to cite this one. They stand here so that no earlier id moves, and they go to their sections at the next renumbering.

**C2-A-181** An `include` has `path`, optional `section`, and optional decoded `options` object. `lines` and `rows` are range strings; an out-of-shape `lines`, `rows` or `cols` value, which `data/include-options.json` keeps on the node, remains a decoded string for expansion to report (C2-B-206), and a `rows` or `cols` written without a value is the empty string. `shift` has at most nine digits (C2-B-205). `region` is an identifier string, `cols` is either a range string or a list of name strings, `shift` is an integer or `"auto"`, and `code` is a syntax string or `true` when no value was written. No quoting or escapes remain in these values; source spelling belongs to the layout record (C2-L-055). The option names and order come from `data/include-options.json`; a repeated `rows` or `cols` keeps the first value (C2-B-206). The node has no `children` and expansion remains the application's job. This replaces the earlier draft list of string pairs.

**C2-A-182** An `include` node has a position like any other block: it starts at its opening braces and ends after its closing braces and the spaces and tabs behind them on its line (C2-A-151). For `{{ a.crv }}` and two spaces the include spans offsets 0 to 13; indented by two spaces, with two spaces behind it, it spans 2 to 15.

**C2-A-183** The attributes of a captioned block that is wrapped in a `figure` are the `attrs` of the `figure`, not of the block inside. A table carries its own.

**C2-A-184** A math block is a `paragraph` containing one display `math` node and any following comment-only lines, with `role: "math"`. A parser sets the role when it closes as one display math line (C2-B-158, C2-B-198); an ordinary paragraph omits it. A captioned math block is that paragraph inside a `figure`.

**C2-A-185** Five facts are set when a block closes: paragraph `role` for image or math, caption attachment, list spacing and table footer rows (C2-B-191). Each is a tree fact used by equality.

**C2-A-187** The bracket label of a div, an admonition, a directive and a code block is the string `groupLabel`, the text between the brackets as written, with no inline parsing: in `::: tip [Tab *x*]` it is `Tab *x*`. In 0.1 the label was inline content.

**C2-A-186** A parsed item, description, term or heading is never empty: one with nothing else holds a comment node (C2-B-136, C2-B-145). A parsed div, admonition, line block, hard-break block or quote may have no children: a quote mark alone on its line is an empty quote (C2-B-031), as is a quote fence with no body (C2-W-032, C2-W-082). A tree that was not parsed from source may hold an item, description, term or heading with no children. There is no sentinel for it, and a Carve writer reports it as unspellable.

```json
{
  "type": "include",
  "path": "parts/intro.crv",
  "section": "setup",
  "options": {"lines": "1-5"}
}
```

**C2-A-188** A valid tree passes the schema and the reader checks nesting depth, position ordering and source agreement when source is available, manifest and header-cell id references, declared `data` keys, envelope version agreement, extension slot names against the declaration, extension fallback depth, metadata field count and annotation ids against a supplied range sidecar. A schema pass alone does not establish validity.

**C2-A-189** A reader refuses a node-shaped object inside opaque `data` or `props`, even when it is nested in a list or object. The core walker ignores that data.

**C2-A-216** An `autolink` carries `text` only where its visible text differs from `href`, which is the email form: `<a@b.org>` gives `href` `mailto:a@b.org` and `text` `a@b.org`, and `<https://x.org>` gives `href` alone.

## Standard data namespaces

**C2-A-190** `carve.source`, `carve.style` and `carve.annotation` are optional declared data namespaces with the value schemas in `data/`.

**C2-A-191** Parsing Carve source produces none of these namespaces.

**C2-A-192** The core HTML renderer ignores all three namespaces. It writes nothing for root metadata `headers`, `footers`, `abstract`, `keywords` or `fields` and reports no notice.

**C2-A-193** A Carve source writer ignores all three namespaces and reports no loss for them, because data is not content. It cannot spell root metadata `headers`, `footers`, `abstract` or `keywords` and reports each under C2-W-011. It handles `fields` under the frontmatter rule of C2-W-011.

**C2-A-194** Equality compares all three data values under C2-A-161.

**C2-A-195** `carve.source` may stand on any node and records the foreign format, a locator with a part, element path or id, and the importer name and version.

**C2-A-196** `carve.source` replaces the 1.x provenance sidecar's source-id graph and byte offsets with a local foreign locator; multi-source lineage and byte spans remain in a separate provenance sidecar.

```json
{"type":"paragraph","children":[{"type":"text","value":"Hello"}],"data":{"carve.source":{"format":"docx","locator":{"part":"word/document.xml","path":"/document/body/p[1]"},"importer":{"name":"pandoc-carve","version":"2.0"}}}}
```

**C2-A-197** `carve.style` may stand on any node with a named style and direct alignment, indentation, spacing before, spacing after, page break before, keep with next, language or direction; on the root it may also hold named styles, page size and margins. It holds scalar facts and named styles. It holds no nodes.

**C2-A-198** Style lengths are non-negative points, alignment is `start`, `center`, `end` or `justify`, and direction is `ltr` or `rtl` where no common `dir` field already holds it.

**C2-A-199** An importer stores only style facts it can read and a target writer may ignore facts it cannot express.

```json
{"type":"document","astVersion":"2.0","children":[],"extensions":[{"name":"carve.style","version":"1","required":false,"slots":[]}],"data":{"carve.style":{"namedStyles":{"Body":{"alignment":"start","spacingAfterPt":6}},"page":{"widthPt":595.28,"heightPt":841.89,"marginsPt":{"top":72,"right":72,"bottom":72,"left":72}}}},"metadata":{"headers":[{"placement":"default","children":[{"type":"paragraph","children":[{"type":"text","value":"Report"}]}]}],"footers":[]}}
```

**C2-A-200** Font families, font sizes, colors, borders, floats, columns, section breaks and arbitrary CSS remain outside `carve.style` because no small shared round-trip vocabulary covers them.

**C2-A-201** Font emphasis already expressed by inline nodes stays in those nodes and never enters `carve.style`.

**C2-A-202** `carve.annotation` may stand on any node and holds a list of ids of entries in the annotation-range sidecar.

**C2-A-203** A tree-only reader checks the shape of each `carve.annotation` value and refuses duplicate ids in a value or across the tree. With the annotation-range sidecar, a reader also checks that each id identifies one range whose start or end path is that node or a descendant.

**C2-A-204** A block-boundary anchor uses the containing block's path and offset zero for its start or the block's annotation-text length for its end; a boundary between two blocks uses the end of the preceding block, or the start of the following block when there is no preceding block.

**C2-A-205** A sidecar range keeps its start and end paths and code point offsets through a tree round trip, while rebinding after edits remains outside this contract.

```json
{"type":"paragraph","children":[{"type":"text","value":"Draft"}],"data":{"carve.annotation":{"ids":["comment-7","revision-2"]}}}
```

**C2-A-206** The three namespace schemas validate only their own values. A tree-only reader checks declaration, namespace placement, duplicate annotation ids and root metadata child slots. A reader given the tree and annotation-range sidecar also checks every annotation id against a range.

**C2-A-207** Annotation text is the node's `value` or `alt` string, or `smart_punctuation.source`, followed by the projections of child slots in `data/node-slots.json` order, with no inserted separator; a soft or hard break contributes one LF and a nonbreaking space contributes one U+00A0, and offsets count Unicode code points.

**C2-A-208** Source format, locator parts, importer name and version, style names and language, and annotation ids are nonempty strings; style page break and keep flags are booleans.

**C2-A-209** Named styles and page occur only in root `carve.style`. Headers and footers occur only in root `metadata`. Direct language or direction occurs only when the node has no corresponding common field.

**Exception C2-A-210** A qualified extension node may carry the canonical source form of C2-X-024 in the tree, even though it changes neither rendering nor resolution; a bare-tree writer needs it to reproduce the claimed source form.

**C2-A-211** The only block boundary in an empty document uses the root path with offset zero.

**C2-A-212** A metadata value is an object with exactly `kind` and `value`. `kind` is `string`, `boolean`, `number`, `inlines`, `blocks`, `list` or `map`. The value has that type. `inlines` and `blocks` are child lists; `list` holds ordered metadata values; `map` holds named metadata values. A walker reaches child lists at every depth. It visits root `fields` and nested `map` entries in Unicode code point name order, and `list` entries in array order. Resolution, the URL policy and rendering profiles apply to their nodes. A reader refuses more than 64 nested metadata values or more than 256 named entries across root `metadata.fields` and nested metadata maps in one document (data/limits.json).

**C2-A-213** A supplied `link` or `image` with `refForm` equal to `shortcut` and a key with no definition is valid. Resolution leaves it unresolved, and rendering writes the unresolved reference as text.

**C2-A-214** The annotation-range sidecar is a JSON object with a `ranges` list. Each range has a nonempty string `id`, a `start` object and an `end` object. Each endpoint has an RFC 6901 `path` into the tree and a nonnegative integer `offset` measured in Unicode code points of the annotation text of that node. The schema is `data/annotation-ranges.schema.json`.

**C2-A-215** A table group made from a delimited table may omit `pos`. Its rows, cells, cell paragraphs and decoded text nodes omit `pos`; the table itself carries the position of its source fence. A pipe table group carries `pos`. These are the delimited table cases of C2-A-158, including the group and decoded text nodes.

## Counts

| Section | Clauses |
| --- | ---: |
| Existing AST contract | 189 |
| Later clauses and standard data namespaces | 27 |
| **Total** | **216** |

## Schema changes owed

The Carve 0.2 tree and envelope are defined by [`data/ast-schema.json`](data/ast-schema.json). The `resources/` schema describes 0.1.

## Open

Points the plan or the tracking ticket leaves open. None is decided here. The contradictions found while porting were ruled on 2026-11-13 and are written into the clauses above.

2. **Edit binding** of annotation-range paths after tree edits remains deferred. C2-A-204 defines block-boundary anchors for an unchanged tree.
4. **The gate for this document.** The plan asks for one and states none. A candidate: the schema validates every tree of the corpus, and the position invariants hold with no waiver file.
