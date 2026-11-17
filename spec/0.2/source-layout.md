# Carve 0.2: the source-layout sidecar

Status: part of the freeze candidate of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md` names the candidate).

The tree of a Carve document holds its meaning (`ast.md`). How the author spelled it is recorded in a second JSON object, the source-layout sidecar. This document defines that object: its shape, the facts it holds, and the spelling a writer uses when it has a tree and no sidecar.

The shape is ported from the sidecar of the `next-ast2` branch (CARVE-P12-032 and CARVE-P12-067, `resources/ast-source-layout-schema.json`). The version 2 schema is `spec/0.2/data/layout-schema.json`. Seven facts are new here: they were tree fields in that draft or in an earlier 0.2 draft and moved out of the tree. `rawAttrs` is new as well and was never a tree field.

Conventions: a clause is a paragraph that starts with an id of the form `C2-L-nnn`. `C2-A-nnn`, `C2-B-nnn` and `C2-I-nnn` name clauses of the AST document and of the block and inline chapters.

## What the sidecar is

**C2-L-001** The sidecar is a record beside the tree. A producer returns it only when the caller asks, and never puts its content into the tree.

Two documents that differ only in sidecar content are the same document (C2-A-004): tree equality (C2-A-161) does not read the sidecar.

**C2-L-003** Parsing, AST JSON, CLI JSON and rendering are the same with and without a sidecar. An AST reader does not accept a sidecar as a tree. A render of source and a render of its tree can still differ: a render of source writes the attribute blocks of an unresolved reference as typed, read from the source (C2-I-085).

**C2-L-004** A sidecar belongs to the one tree it was returned with. Its paths do not hold after that tree is edited.

**C2-L-005** A sidecar does not survive a write: the written source is a new input with a layout of its own.

**C2-L-006** The tree wins. A writer ignores a sidecar fact that contradicts the tree, such as a `sourceFormat` on a table that a delimited table cannot hold.

## Shape

**C2-L-007** The sidecar is an object with six required fields and no others:

| Field | Value |
| --- | --- |
| `version` | `2` |
| `encoding` | `"utf-8"`, or `"base64"` for a byte input that is not well-formed UTF-8 (C2-L-056) |
| `source` | the original input: the string, or under `"base64"` the bytes in base64 |
| `lineEndings` | `none`, `lf`, `crlf`, `cr` or `mixed` |
| `bom` | whether the input starts with U+FEFF |
| `nodes` | a list of node entries |

The draft had `version: 1`. The version changes because the closed schema gains fields.

**C2-L-008** A reader refuses a sidecar version it does not implement.

**C2-L-058** A reader also refuses a record that breaks C2-L-011, C2-L-012, C2-L-020, C2-L-027 or C2-L-056, judging a fact only on an entry whose node type defines it. A writer ignores an entry whose path names no node of the tree, and a fact that is not defined for the type of the node its entry names (C2-L-006).

**C2-L-009** A node entry has `path`, `startByte` and `endByte`, and may have any of the facts below. It has no other fields.

**C2-L-010** `path` is an RFC 6901 JSON Pointer into the tree. The empty string is the root, and `/children/2/children/0` is the first child of the third block. This is how every sidecar fact refers to its node.

**C2-L-011** Entries stand in document order, a node before the nodes inside it, which compares each index of a `path` as a number: `/children/2` stands before `/children/10`. The slots of one node are visited in the order `title`, `children`, `caption`, and its other slots after them in the order of `data/node-slots.json`, the named slots of an extension node in the order of its declaration (C2-X-020). The nodes in a `fallback` have no entry. No two entries have the same path.

**C2-L-012** `startByte` and `endByte` are a range in bytes of the original input, start inclusive and end exclusive: its UTF-8 bytes, or under `"base64"` the bytes as given (C2-L-056). For a node that has `pos` they equal `pos.startOffset` and `pos.endOffset` (C2-A-141): a byte-order mark and every CR are counted as they stand. A range never exceeds the byte length of the input. An offset into a node value, as in `wraps` (C2-L-020), counts the UTF-8 bytes of that value.

**C2-L-056** `encoding` is `"base64"` exactly when the input was given as bytes that are not well-formed UTF-8 (C2-B-218), and `"utf-8"` for every other input. Under `"base64"`, `source` holds those bytes in the base64 alphabet of RFC 4648, section 4, with padding, and the ranges count them as they stand, so they still equal `pos`. A string input with an unpaired surrogate is no byte input: it keeps `"utf-8"`, and its `source` holds U+FFFD in place of the surrogate, whose three bytes are the ones C2-B-218 counts. For the bytes `61 FF 62` the sidecar has `"encoding": "base64"` and `"source": "Yf9i"`, and the entry of the paragraph spans bytes 0 to 3.

**C2-L-013** A producer does not invent a range. A node whose source is not one contiguous range, such as a cell joined from continuation rows, has an entry whose range runs from the start of its first piece to the end of its last. Such a node has no `pos` (C2-A-156), so this range is not a position.

**C2-L-014** Source and ranges are the minimum. Every fact is optional, and an absent fact means unknown: a producer omits what it did not measure, and a consumer does not read an absent fact as a value.

**C2-L-015** A writer that finds no fact uses the default of the section "Defaults". That is a rule about writing, not a reading of the document: the default is never reported as what the author wrote.

```json
{
  "version": 2,
  "encoding": "utf-8",
  "source": ". a\n. b\n",
  "lineEndings": "lf",
  "bom": false,
  "nodes": [
    { "path": "/children/0", "startByte": 0, "endByte": 7, "bare": true },
    { "path": "/children/0/children/0", "startByte": 0, "endByte": 3, "markerRaw": ".", "markerColumn": 0, "contentColumn": 2 },
    { "path": "/children/0/children/1", "startByte": 4, "endByte": 7, "markerRaw": ".", "markerColumn": 0, "contentColumn": 2 }
  ]
}
```

## Facts moved out of the tree

These facts hold spelling that the tree does not. The last column names the field that held it in the `next-ast2` draft.

| Fact | On the entry of | Value | Draft tree field |
| --- | --- | --- | --- |
| `bare` | an ordered `list` | `true` when the items are numbered with the bare dot | `list.marker.bare` |
| `fenced` | a `block_quote` | `true` for a quote fence, `false` for `>` lines | `block_quote.fenced` |
| `hardBreakOpener` | a `div` with the class `hardbreaks` | `true` for the hard-break opener, `false` for the class form | none; the draft had no field |
| `wraps`, `continuationLines` | a `table_cell`, a `table_row` | where continuation rows broke the cell, and how many the row has | `cell_wrap`, `cellWraps`, `table_row.continuationLines` |
| `rawRef` | a `link` or `image` that carries `key` | the reference as typed, from the opening bracket to the bracket that closes the reference (C2-L-049) | `link.rawRef`, `image.rawRef` |
| `rawAttrs` | a `link` or `image` that carries `key`, or a `footnote_ref`, and has attribute blocks glued to it | the glued attribute blocks as typed, from the first opening brace to the last closing brace (C2-L-049) | none; the draft had no field |
| `sourceFormat` | a `table` | `pipe`, `csv` or `tsv` | `table.sourceFormat` |
| `headerRows` | a delimited `table` | the effective count of its `header-rows` attribute | `table_body.headRows` |

**C2-L-016** `bare` says whether an ordered list was numbered with the bare dot or with written numbers. A list that mixes both (C2-B-043) records the form of its first marker, and the formatter writes the whole list in that form. The tree holds only the start value (C2-A-056).

**C2-L-017** `fenced` says which of the two quote forms the author wrote. Both give the same `block_quote`.

**C2-L-018** `hardBreakOpener` says which of the two forms of a hard-break block the author wrote. Both give the same `div` (C2-A-068).

**C2-L-019** `continuationLines` on a row entry is the number of continuation rows below that row, the ones with only empty fragments included.

**C2-L-020** `wraps` on a cell entry is a list of objects, sorted by `line`. Each has `line`, the number of the continuation row counted from 1; `path`, the pointer of the text node among the children of the cell's paragraph that holds the space joining that row's fragment (C2-B-184); and `offset`, the UTF-8 byte offset behind that space in the node's value, where the fragment starts. A wrap falls between two fragments, so it never lies inside another node (C2-L-048). A wrap in a cell that spans rows also has `row`, the number of rows below the cell's own row.

**C2-L-022** `rawRef` is the only place that holds a reference label as typed. The tree holds the folded `key` and the `refForm` (C2-A-105).

**C2-L-023** `sourceFormat` says how a table was written. The tree is the same for a pipe table and a delimited table with the same cells in the same groups (C2-A-088): blocks Examples 267 and 268 give equal trees.

**C2-L-057** `headerRows` on the entry of a delimited table is the effective count of a valid `header-rows` attribute the source gave (C2-B-209, C2-B-221), 0 included. A table without the attribute, and a pipe table, on which the attribute has no effect (C2-B-186), have no such fact. The groups of the tree hold the partition; the fact records only that the count was written. A `headerRows` that differs from the number of head rows of the tree contradicts the tree, and the writer ignores it (C2-L-006).

```json
{
  "version": 2,
  "encoding": "utf-8",
  "source": "| a |\n+ b |\n",
  "lineEndings": "lf",
  "bom": false,
  "nodes": [
    { "path": "/children/0", "startByte": 0, "endByte": 11, "sourceFormat": "pipe" },
    { "path": "/children/0/children/0/children/0", "startByte": 0, "endByte": 11, "continuationLines": 1 },
    {
      "path": "/children/0/children/0/children/0/children/0",
      "startByte": 1,
      "endByte": 10,
      "wraps": [
        { "line": 1, "path": "/children/0/children/0/children/0/children/0/children/0/children/0", "offset": 2 }
      ]
    }
  ]
}
```

In this example the cell's text value is `a b`, and the fragment of the first continuation row starts at byte 2.

## Measured facts carried over

These facts are ported from the draft. Columns in them are the zero-based columns of the block chapter (C2-B-003, C2-B-004), not the columns of `pos`.

| Fact | On the entry of | Value |
| --- | --- | --- |
| `markerRaw` | a `list_item`, a `definition_term`, a `definition_description`, a `heading`, a `thematic_break`, a definition | the marker as typed, without the space after it |
| `markerColumn` | the same | the column of the marker's first character |
| `contentColumn` | a `list_item`, a `definition_description`, a `footnote` | the content column |
| `continuationStyle` | a `list_item`, a `definition_description` and a `footnote` (C2-L-052) | `lazy`, `indent`, `marker_line` or `none` |
| `blankLinesBefore`, `blankLinesAfter` | any block | the number of blank lines around the node inside its container |
| `openerRaw`, `closerRaw` | a `code_block`, a `div`, an `admonition`, a `directive`, a `line_block`, a fenced `block_quote`, a block `comment`, a `raw_block`, `frontmatter` | the delimiter runs as typed, without the info string |
| `metadataSeparatorRaw` | a definition, a `definition_term` | the separator between the label or term and its body, whitespace included |
| `attachment` | a `caption` | `preceding` or `none` |

**C2-L-024** `markerRaw` is the exact source text of the marker that opened the node. For a heading it tells `#` from `=`, and for a fence `openerRaw` gives the length of the run.

**C2-L-025** `continuationStyle` has one value, chosen in this order: `lazy` when a paragraph line stands left of the content column, else `indent` when a later line reaches the content column, else `marker_line` when all content is on the marker line, else `none`.

**C2-L-026** `blankLinesBefore` and `blankLinesAfter` are the authored counts, not a normalized 0 or 1.

**C2-L-027** `openerRaw` and `closerRaw` come as a pair. An unclosed block has `closerRaw` present and empty. `openerRaw` is never empty.

**C2-L-028** `continuationStyle` has no value for a list continuation marker and `attachment` has none for a block attached by one, since 0.2 has no such marker. No fact records a leading or a trailing pipe, since a row always starts and ends with a pipe (C2-B-166).

**C2-L-029** A fact that the schema declares and this document does not define is a defect.

**C2-L-055** An include entry may carry `optionSpelling`, a closed object keyed by the option names of `data/include-options.json`; each value is the exact quoted or bare source spelling of that option value. The tree keeps the decoded typed value (C2-A-181), and the formatter uses this fact only when it decodes to the same value.

## Defaults

A writer that starts from a tree with no sidecar, or with a sidecar that lacks a fact, writes the canonical form of each spelling.

**C2-L-030** A decimal ordered list whose delimiter is the period is written with the bare dot on every item, the first included. A list that does not start at 1 carries its start value in a `start` attribute on the attribute line above it (C2-B-045): a number on the first marker would be read back as the numbered form. The writer clause names the exceptions (C2-W-044).

**C2-L-031** Every other ordered list is written with its numbers, letters or numerals in sequence from the start value: a list whose `marker.style` is not `1`, and a list with the `)` delimiter, since a bare `)` is not a marker (C2-B-036). A first marker that could read as another style is written as C2-W-045 says.

**C2-L-032** A bullet list is written with the character in `marker.char`. A writer writes `-` only where the tree says `-`, and does not change the character to separate two lists.

**C2-L-033** A quote is written with `>` lines.

**C2-L-034** A div with the class `hardbreaks` is written with the hard-break opener when every line break inside it is a `hard_break` and `hardbreaks` is the last of its classes, and in the class form otherwise. The opener adds the class last (C2-A-068), so the opener form on any other div would change the order of its classes.

**C2-L-035** A table row is written on one line, with no continuation rows.

**C2-L-036** A table is written as a pipe table. A table with no rows is written as a delimited table, because a pipe table needs a row.

**C2-L-037** A code block is written with the shortest run of at least three backticks that is longer than every bare backtick run on a line of its `value`, at any indent (C2-W-038). A fenced container is written with a colon run of the smallest length of at least three that is longer than the runs of the divs inside it (C2-W-039).

**C2-L-038** A heading is written with `=`.

**C2-L-039** A thematic break is written as `***`.

**C2-L-040** A reference is written from the tree: its text, then `[key]` for the form `full` or `[]` for the form `collapsed`. The form `shortcut` writes only its text in brackets, with no label tail. C2-W-075 spells a key that starts with a caret or an at-sign.

**C2-L-041** The remaining layout is the canonical layout of the Writer document: one blank line between blocks where the tree's `spacing` does not say otherwise, content indented to the content column, a bare `---` for YAML frontmatter, double quotes for a title.

| Spelling | Default with no fact | With a fact |
| --- | --- | --- |
| ordered numbering | bare dot for a decimal list with the period, written numbers otherwise | kept: bare dot or written numbers |
| quote | `>` lines | kept: lines or fence |
| hard-break block | opener when all breaks are hard and the class is last, else class form | kept, when the tree allows it |
| table row | one line | kept: continuation rows at the recorded places |
| table form | pipe table, delimited when it has no rows | kept, when the tree allows it |
| head count of a delimited table | `header-rows` only where the head is not the first row (C2-W-066) | kept, when it equals the head |
| code fence | backticks, shortest safe length | normalized to the default |
| heading marker | `=` | normalized to `=` |
| thematic break | `***` | normalized to `***` |
| bullet character | from the tree | from the tree |

**C2-L-042** Where 0.2 has two equal forms, the formatter keeps the form the sidecar records: ordered numbering, the quote form, the hard-break form, the table form, a declared head count and continuation rows.

**C2-L-043** Where 0.2 has one canonical form, the formatter writes it whatever the sidecar records: the heading marker, the thematic break, the fence character and length, the frontmatter opener.

**C2-L-044** Neither choice changes the tree, so both pass the round-trip gate (C2-W-002).

**C2-L-045** `markerColumn` on the entry of a `comment` that came from a comment-only line inside a quote is the column of the quote mark on that line. No writer rule reads it.

**C2-L-046** The writer reads ten facts: `bare`, `fenced`, `hardBreakOpener`, `wraps`, `continuationLines`, `sourceFormat`, `headerRows`, `rawRef`, `rawAttrs` and `optionSpelling` (C2-W-083, C2-W-084). The measured facts of the section "Measured facts carried over" have no reader in the 0.2 documents. They are for editors and other tools that need the layout as typed.

**C2-L-047** Every node in a list of blocks of the top-level document (C2-A-051), outside a caption and a table cell, and every `list_item`, `definition_term`, `definition_description` and `caption` has an entry with `blankLinesBefore` and `blankLinesAfter`, 0 included, since an absent fact means unknown. Table groups, rows and cells, the blocks inside a cell, the lines of a line block and the blocks inside a caption have no such facts, and the blocks of a `fallback` have no entry (C2-L-011). The blocks in the children of an expanded include have no entries (C2-N-082). An inline node has an entry only when it has a fact. The examples of this document show only the entries and facts under discussion.

**C2-L-048** The `wraps` of a cell are sorted by `line`, and those of one line by `row`; a cell that spans rows has `row` on every wrap, 0 for its own row. A cell whose content starts in a continuation row has no joining space: its wrap for that row names its first inline node with `offset` 0.

**C2-L-049** `rawRef` starts at the opening bracket, without the `!` of an image, and ends at the bracket that closes the reference, without an attribute block. In the full and collapsed forms this is the label's closing bracket; in the shortcut form it is the text pair's closing bracket. It is read without the prefixes of the lines it crosses, and the pieces are joined by a line feed. `rawAttrs` starts at the first brace behind that bracket and ends at the brace that closes the last glued attribute block; it is read the same way. For an unresolved reference a render of source writes this span of the source (C2-I-085), and the writer writes it back (C2-W-084); no renderer reads the sidecar.

**C2-L-050** `markerRaw` of a definition is its label with the colon, as `[^n]:`, `[r]:` and `*[A]:`, and its `metadataSeparatorRaw` is the colon with the spaces behind it, so the colon is in both. For a `definition_term`, `markerRaw` is `::` and the separator is the run of spaces between the mark and the term text.

**C2-L-051** A task box and the attribute blocks glued to a marker are not content of the item: `contentColumn` of `- [x] a` is the column of `a`. This is a fact of the layout record only: the marker tests of the block chapter read the text behind the marker before the box is taken out (C2-B-229).

**C2-L-052** `continuationStyle` stands on every `list_item`, `definition_description` and `footnote`, with `marker_line` when the node has no later line. `lazy` is a later line of a paragraph inside the node, at any depth, that stands left of the content column; `indent` is a later line at or right of it.

**C2-L-053** A line is blank inside a quote when it carries exactly the marks of the open quotes and nothing else. Blank lines behind the last content of a quote that still carry its mark are counted as `blankLinesAfter` of the last block of the quote; a blank line without the mark is outside the quote and counts for the blocks around the quote.

**C2-L-054** A `figure_group` and a delimited table have no `openerRaw` and no `closerRaw`. A parse gives every `caption` the `attachment` `preceding`; `none` occurs only in a supplied record. A comment whose line lacks the mark of its quote has no `markerColumn`. `lineEndings` reports what the source holds, a lone CR included, although a lone CR ends no line (C2-B-010).

## Schema

[`data/layout-schema.json`](data/layout-schema.json) defines the closed version 2 layout record.

## Counts

The document has 56 clauses. The reduction of 17 November 2026 deleted C2-L-002, whose rule another clause states; its id is not reused.
