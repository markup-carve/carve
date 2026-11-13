# Carve 0.2: the source-layout sidecar

Status: first draft on `next2`. Nothing in this document is implemented yet.

The tree of a Carve document holds its meaning (`ast.md`). How the author spelled it is recorded in a second JSON object, the source-layout sidecar. This document defines that object: its shape, the facts it holds, and the spelling a writer uses when it has a tree and no sidecar.

The shape is ported from the sidecar of the `next-ast2` branch (CARVE-P12-032 and CARVE-P12-067, `resources/ast-source-layout-schema.json`). Six facts are new here: they were tree fields in that draft and moved out of the tree.

Conventions: a clause is a paragraph that starts with an id of the form `C2-L-nnn`. `C2-A-nnn`, `C2-B-nnn` and `C2-I-nnn` name clauses of the AST document and of the block and inline chapters.

## What the sidecar is

**C2-L-001** The sidecar is a record beside the tree. A producer returns it only when the caller asks, and never puts its content into the tree.

**C2-L-002** Two documents that differ only in sidecar content are the same document: tree equality (C2-A-160) does not read the sidecar.

**C2-L-003** Parsing, AST JSON, CLI JSON and rendering are the same with and without a sidecar. An AST reader does not accept a sidecar as a tree.

**C2-L-004** A sidecar belongs to the one tree it was returned with. Its paths do not hold after that tree is edited.

**C2-L-005** A sidecar does not survive a write: the written source is a new input with a layout of its own.

**C2-L-006** The tree wins. A writer ignores a sidecar fact that contradicts the tree, such as a `sourceFormat` on a table that a delimited table cannot hold.

## Shape

**C2-L-007** The sidecar is an object with six required fields and no others:

| Field | Value |
| --- | --- |
| `version` | `2` |
| `encoding` | `"utf-8"` |
| `source` | the original input as a string |
| `lineEndings` | `none`, `lf`, `crlf`, `cr` or `mixed` |
| `bom` | whether the input starts with U+FEFF |
| `nodes` | a list of node entries |

The draft had `version: 1`. The version changes because the closed schema gains fields.

**C2-L-008** A reader refuses a sidecar version it does not implement.

**C2-L-009** A node entry has `path`, `startByte` and `endByte`, and may have any of the facts below. It has no other fields.

**C2-L-010** `path` is an RFC 6901 JSON Pointer into the tree. The empty string is the root, and `/children/2/children/0` is the first child of the third block. This is how every sidecar fact refers to its node.

**C2-L-011** Entries are sorted by `path`, and no two entries have the same path.

**C2-L-012** `startByte` and `endByte` are a range in UTF-8 bytes of `source`, start inclusive and end exclusive. A range never exceeds the byte length of `source`. Every other offset in the sidecar is in UTF-8 bytes too.

**C2-L-013** A producer does not invent a range. What an entry holds for a node without a contiguous source range (C2-A-153) is open (Open, point 5).

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

These six facts were tree fields in the `next-ast2` draft.

| Fact | On the entry of | Value | Draft tree field |
| --- | --- | --- | --- |
| `bare` | an ordered `list` | `true` when the items are numbered with the bare dot | `list.marker.bare` |
| `fenced` | a `block_quote` | `true` for a quote fence, `false` for `>` lines | `block_quote.fenced` |
| `hardBreakOpener` | a `div` with the class `hardbreaks` | `true` for the hard-break opener, `false` for the class form | none; the draft had no field |
| `wraps`, `continuationLines` | a `table_cell`, a `table_row` | where continuation rows broke the cell, and how many the row has | `cell_wrap`, `cellWraps`, `table_row.continuationLines` |
| `rawRef` | a `link` or `image` that carries `key` | the reference as typed, from the opening bracket to the last closing bracket | `link.rawRef`, `image.rawRef` |
| `sourceFormat` | a `table` | `pipe`, `csv` or `tsv` | `table.sourceFormat` |

**C2-L-016** `bare` says whether an ordered list was numbered with the bare dot or with written numbers. The tree holds only the start value (C2-A-054).

**C2-L-017** `fenced` says which of the two quote forms the author wrote. Both give the same `block_quote`.

**C2-L-018** `hardBreakOpener` says which of the two forms of a hard-break block the author wrote. Both give the same `div` (C2-A-066).

**C2-L-019** `continuationLines` on a row entry is the number of continuation rows below that row, the ones with only empty fragments included.

**C2-L-020** `wraps` on a cell entry is a list of objects, sorted by `line`. Each has `line`, the number of the continuation row counted from 1; `path`, the pointer of the node whose `value` holds the break; and `offset`, the UTF-8 byte offset in that `value` at which the fragment of that row starts. A wrap in a cell that spans rows also has `row`, the number of rows below the cell's own row.

**C2-L-021** The joining space that a continuation row leaves in the cell's text (C2-A-092) is the character before `offset`. A fragment that joins an empty cell has `offset` 0.

**C2-L-022** `rawRef` is the only place that holds a reference label as typed. The tree holds the folded `key` and the `form` (C2-A-103).

**C2-L-023** `sourceFormat` says how a table was written. The tree is the same for a pipe table and a delimited table with the same cells.

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
| `continuationStyle` | a block with later lines | `lazy`, `indent`, `marker_line` or `none` |
| `blankLinesBefore`, `blankLinesAfter` | any block | the number of blank lines around the node inside its container |
| `openerRaw`, `closerRaw` | a `code_block`, a `div`, an `admonition`, a `directive`, a `line_block`, a fenced `block_quote`, a block `comment`, a `raw_block`, `frontmatter` | the delimiter runs as typed, without the info string |
| `metadataSeparatorRaw` | a definition, a `definition_term` | the separator between the label or term and its body, whitespace included |
| `attachment` | a `caption` | `preceding` or `none` |

**C2-L-024** `markerRaw` is the exact source text of the marker that opened the node. For a heading it tells `#` from `=`, and for a fence `openerRaw` tells a tilde from a backtick and gives the length.

**C2-L-025** `continuationStyle` has one value, chosen in this order: `lazy` when a paragraph line stands left of the content column, else `indent` when a later line reaches the content column, else `marker_line` when all content is on the marker line, else `none`.

**C2-L-026** `blankLinesBefore` and `blankLinesAfter` are the authored counts, not a normalized 0 or 1.

**C2-L-027** `openerRaw` and `closerRaw` come as a pair. An unclosed block has `closerRaw` present and empty. `openerRaw` is never empty.

**C2-L-028** Facts and values of the draft that 0.2 has no syntax for are removed: the value `explicit` of `continuationStyle` and the value `continuation` of `attachment`, which both recorded the list continuation marker, and `leadingPipe` and `trailingPipe`, since a row always starts and ends with a pipe (C2-B-114).

**C2-L-029** A fact that the schema declares and this document does not define is a defect.

## Defaults

A writer that starts from a tree with no sidecar, or with a sidecar that lacks a fact, writes the canonical form of each spelling.

**C2-L-030** An ordered list is written with the bare dot. The first item carries a number only when `marker.start` is present, that is when the list does not start at 1; every later item is a bare dot.

**C2-L-031** A list whose `marker.style` is not `1` cannot use the bare dot and is written with its letters or numerals in sequence.

**C2-L-032** A bullet list is written with the character in `marker.char`. A writer writes `-` only where the tree says `-`, and does not change the character to separate two lists.

**C2-L-033** A quote is written with `>` lines.

**C2-L-034** A div with the class `hardbreaks` is written with the hard-break opener when every line break inside it is a `hard_break`, and in the class form otherwise.

**C2-L-035** A table row is written on one line, with no continuation rows.

**C2-L-036** A table is written as a pipe table. A table with no rows is written as a delimited table, because a pipe table needs a row.

**C2-L-037** A code block is written with a backtick fence of the smallest length that is at least three and longer than every backtick run at the start of a line of its `value`. A fenced container is written with a colon run of the smallest length that is longer than the runs of the divs inside it.

**C2-L-038** A heading is written with `=`.

**C2-L-039** A thematic break is written as `***`.

**C2-L-040** A reference is written from the tree: its text, then `[key]` for the form `full` or `[]` for the form `collapsed`.

**C2-L-041** The remaining layout is the canonical layout of the Writer document: one blank line between blocks where the tree's `spacing` does not say otherwise, content indented to the content column, a bare `---` for YAML frontmatter, double quotes for a title.

| Spelling | Default with no fact | With a fact |
| --- | --- | --- |
| ordered numbering | bare dot | kept: bare dot or written numbers |
| quote | `>` lines | kept: lines or fence |
| hard-break block | opener when all breaks are hard, else class form | kept, when the tree allows it |
| table row | one line | kept: continuation rows at the recorded places |
| table form | pipe table, delimited when it has no rows | kept, when the tree allows it |
| code fence | backticks, minimal length | normalized to the default |
| heading marker | `=` | normalized to `=` |
| thematic break | `***` | normalized to `***` |
| bullet character | from the tree | from the tree |

**C2-L-042** Where 0.2 has two equal forms, the formatter keeps the form the sidecar records: ordered numbering, the quote form, the hard-break form, the table form and continuation rows.

**C2-L-043** Where 0.2 has one canonical form, the formatter writes it whatever the sidecar records: the heading marker, the thematic break, the fence character and length, the frontmatter opener, the quote character of a title.

**C2-L-044** Neither choice changes the tree, so both pass the round-trip gate (C2-A-161).

## Schema changes owed

`resources/ast-source-layout-schema.json` is not edited in this pull request. To match this document:

1. `version`: `const` 2.
2. `nodeLayout` gains `bare`, `fenced` and `hardBreakOpener` (boolean), `continuationLines` (integer, minimum 0), `rawRef` (string), `sourceFormat` (enum `pipe`, `csv`, `tsv`) and `wraps` (list of objects with required `line`, `path` and `offset` and optional `row`).
3. `continuationStyle`: remove `explicit` from the enum.
4. `attachment`: remove `continuation` and `detached` from the enum.
5. `nodeLayout` loses `leadingPipe` and `trailingPipe`.

## Open

1. **Byte ranges and `pos` offsets.** The draft counts sidecar bytes in the original input, with the BOM and CRLF bytes included, and says that such a range is not a `pos` offset. The 0.2 decision is that sidecar ranges are UTF-8 bytes like positions. Whether the two number spaces are the same for an input with a BOM or with CRLF line endings is not stated. Options: (a) both count bytes of the original input; (b) `pos` counts after line-ending normalization and the sidecar counts the original.
2. **Names and shape of the moved facts.** `bare`, `fenced`, `rawRef` and `sourceFormat` keep their draft tree names. `hardBreakOpener`, `wraps` and `continuationLines` on a row entry are first drafted here. An alternative for the first two booleans is to derive them from `markerRaw` and `openerRaw`, which already tell a bare dot and a quote fence.
3. **The marker column of a quoted comment line.** The tracking ticket rules that the column of the quote mark on a comment line is spelling and belongs in the sidecar. No fact is defined for it yet. A candidate: `markerColumn` on the entry of the comment.
4. **`attachment: detached`.** The draft value records a caption position that was written but detached by blank lines. In 0.2 a caption stands directly below its block (C2-B-101), so the value has nothing left to record and item 4 above removes it. If a detached form returns, the value returns with it.
5. **Entries for nodes without a range.** A node joined from continuation rows has no contiguous range (C2-L-013), yet its facts (`wraps`) need an entry. Options: (a) the entry carries the range from the first piece to the last; (b) `startByte` and `endByte` become optional; (c) the facts move to the nearest positioned ancestor. The example above uses (a).
6. **The gate for this document.** The plan asks for one and states none. A candidate: for every corpus document, writing the tree with its sidecar gives the formatter's output, and writing it without gives a source that parses to an equal tree.
