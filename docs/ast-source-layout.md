---
description: Byte ranges and written forms recorded in a source layout sidecar beside the tree.
---

# Source layout beside parsed document JSON

The [parsed document JSON](/ast-json) records what a document means, not every choice the author made while typing it. A quote written with `>` lines and one written as a quote fence give the same tree. So do a list numbered `1.` `2.` and one numbered with bare dots. An editor that highlights markers, a formatter that keeps the author's spelling, or a tool that maps a node back to its bytes needs that second kind of fact.

`parseWithLayout` returns the tree together with a **source-layout sidecar**: a separate JSON object that holds the original source, byte ranges for the nodes, and spelling facts. The tree inside the result is the same tree `parse` returns. AST JSON, CLI output, and rendering do not change when you ask for a sidecar, and an AST reader does not accept a sidecar in place of a tree.

## A worked example

This document uses two spellings that have an equal alternative in Carve 0.2: a quote fence instead of `>` lines, and written numbers instead of bare dots.

```crv
::: >
Quoted *text*.
:::

1. First
2. Second
```

`parseWithLayout(source)` returns `document`, `layout`, `diagnostics`, and `suppressedDiagnostics`. The `layout` is:

```json
{
  "version": 2,
  "encoding": "utf-8",
  "source": "::: >\nQuoted *text*.\n:::\n\n1. First\n2. Second\n",
  "lineEndings": "lf",
  "bom": false,
  "nodes": [
    { "path": "/children/0", "startByte": 0, "endByte": 24, "fenced": true, "openerRaw": ":::", "closerRaw": ":::", "blankLinesBefore": 0, "blankLinesAfter": 1 },
    { "path": "/children/0/children/0", "startByte": 6, "endByte": 20, "blankLinesBefore": 0, "blankLinesAfter": 0 },
    { "path": "/children/1", "startByte": 26, "endByte": 44, "bare": false, "blankLinesBefore": 1, "blankLinesAfter": 0 },
    { "path": "/children/1/children/0", "startByte": 26, "endByte": 34, "markerRaw": "1.", "markerColumn": 0, "contentColumn": 3, "continuationStyle": "marker_line", "blankLinesBefore": 0, "blankLinesAfter": 0 },
    { "path": "/children/1/children/0/children/0", "startByte": 29, "endByte": 34, "blankLinesBefore": 0, "blankLinesAfter": 0 },
    { "path": "/children/1/children/1", "startByte": 35, "endByte": 44, "markerRaw": "2.", "markerColumn": 0, "contentColumn": 3, "continuationStyle": "marker_line", "blankLinesBefore": 0, "blankLinesAfter": 0 },
    { "path": "/children/1/children/1/children/0", "startByte": 38, "endByte": 44, "blankLinesBefore": 0, "blankLinesAfter": 0 }
  ]
}
```

The entries are the engine's output with each entry on one line. `fenced: true` says the quote was a fence, and `bare: false` says the list used written numbers. Neither fact is in the tree.

The writer shows what a host does with it. `write(document)` with no sidecar writes the canonical defaults:

```crv
> Quoted *text*.

. First
. Second
```

`write(document, { layout })` keeps both choices and returns the original source:

```crv
::: >
Quoted *text*.
:::

1. First
2. Second
```

`carve fmt` parses with layout and writes with it, so formatting a file keeps these spellings. `carve fmt --normalize` writes as if there were no sidecar, which turns this document into the first output.

## Shape

The sidecar is an object with exactly six fields:

| Field | Value |
| --- | --- |
| `version` | `2` |
| `encoding` | `"utf-8"`, or `"base64"` for byte input that is not well-formed UTF-8 |
| `source` | the original input: the string, or its bytes in base64 under `"base64"` |
| `lineEndings` | `none`, `lf`, `crlf`, `cr`, or `mixed` |
| `bom` | whether the input starts with U+FEFF |
| `nodes` | the node entries |

Each node entry has `path`, `startByte`, and `endByte`, plus any facts measured for that node, and no other fields:

- `path` is an RFC 6901 JSON Pointer into the tree returned with the sidecar. The empty string is the root, and `/children/2/children/0` is the first child of the third block.
- `startByte` and `endByte` are a start-inclusive, end-exclusive range of the original input bytes. For a node that has `pos`, they equal `pos.startOffset` and `pos.endOffset`. A byte-order mark and every CR count as they stand.
- Entries stand in document order, a node before the nodes inside it, comparing each path index as a number (`/children/2` before `/children/10`). No two entries share a path.

`validateLayout` checks a record and throws `CarveLayoutError` with the `path` of the field it refuses, including any version other than 2.

## Facts moved out of the tree

These facts record spelling that has two equal forms in 0.2. Each was a tree field in an earlier draft of contract 2.0:

| Fact | On the entry of | Value |
| --- | --- | --- |
| `bare` | an ordered `list` | `true` when the items use the bare dot |
| `fenced` | a `block_quote` | `true` for a quote fence, `false` for `>` lines |
| `hardBreakOpener` | a `div` with class `hardbreaks` | `true` for the `::: \` opener, `false` for the class form |
| `wraps`, `continuationLines` | a `table_cell`, a `table_row` | where continuation rows broke the cell, and how many the row has |
| `rawRef` | a `link` or `image` that carries `key` | the reference as typed, from the opening bracket to the bracket that closes it |
| `sourceFormat` | a `table` | `pipe`, `csv`, or `tsv` |
| `headerRows` | a delimited `table` | the effective count of its `header-rows` attribute |
| `optionSpelling` | an `include` | the quoted or bare spelling of each option value |

`rawRef` is the only place that keeps a reference label as typed; the tree holds the folded `key` and the `refForm`. For a mixed list of bare dots and numbers, `bare` records the form of the first marker, and the formatter writes the whole list that way.

## Measured facts

These facts describe layout for editors and other tools. No writer rule reads them. Their columns are zero-based visual columns from the block chapter, not the one-based code point columns of `pos`.

| Fact | On the entry of | Value |
| --- | --- | --- |
| `markerRaw` | list items, terms, descriptions, headings, thematic breaks, definitions | the marker as typed, without the space after it |
| `markerColumn` | the same | the column of the marker's first character |
| `contentColumn` | a `list_item`, a `definition_description`, a `footnote` | the content column; `- ` gives 2 |
| `continuationStyle` | the same three | `lazy`, `indent`, `marker_line`, or `none` |
| `blankLinesBefore`, `blankLinesAfter` | blocks outside captions and table cells, items, terms, descriptions, captions | the authored count of blank lines around the node inside its container |
| `openerRaw`, `closerRaw` | fenced blocks: code, divs, line blocks, quote fences, comment blocks, raw blocks, frontmatter | the delimiter runs as typed, without the info string |
| `metadataSeparatorRaw` | a definition, a `definition_term` | the separator after the label or term, whitespace included |
| `attachment` | a `caption` | `preceding` or `none` |

`continuationStyle` takes one value by precedence: `lazy` when a later paragraph line stands left of the content column, else `indent` when a later line reaches it, else `marker_line` when all content is on the marker line. A parse never gives `none`; it appears only in a supplied record. A task box does not move the content column: `- [x] a` has `contentColumn` 2. An unclosed fenced block has `closerRaw` present and empty, never omitted.

## Missing means unknown

Source and ranges are the minimum. Every other fact is optional, and an absent fact means the producer did not measure it. A consumer must not read an absence as a default value, and a writer that finds no fact uses the canonical default without claiming the author wrote it.

Two exceptions are always present in a parse: `blankLinesBefore` and `blankLinesAfter` on every block outside a caption or table cell and on every item, term, description, and caption (0 included), and `continuationStyle` on every list item, description, and footnote. An inline node has an entry only when it has a fact.

## What the writer does with it

The writer reads nine facts: `bare`, `fenced`, `hardBreakOpener`, `wraps`, `continuationLines`, `sourceFormat`, `headerRows`, `rawRef`, and `optionSpelling`. It also reads `source` and the byte ranges for one fallback: where a leaf block written from the tree does not read back as the same tree, it copies that block's authored source. Where 0.2 has two equal forms, it keeps the form the sidecar records. Where 0.2 has one canonical form, it writes that form whatever the sidecar says.

| Spelling | Default with no fact | With a fact |
| --- | --- | --- |
| ordered numbering | bare dot for a decimal list with `.`, written numbers otherwise | kept |
| quote | `>` lines | kept |
| hard-break block | opener when every break is hard and the class is last, else the class form | kept when the tree allows it |
| table row | one line | continuation rows kept at the recorded places |
| table form | pipe table; delimited when it has no rows | kept when the tree allows it |
| head count of a delimited table | `header-rows` only where the head is not the first row | kept when it equals the head |
| code fence | backticks, shortest safe length | normalized |
| heading marker | `=` | normalized to `=` |
| thematic break | `***` | normalized to `***` |
| bullet character | from the tree | from the tree |

The bullet character is meaning in 0.2 (`list.marker.char`), so it is in the tree, not the sidecar.

## Lifetime and edge cases

**A sidecar belongs to one tree.** Its paths name nodes in the tree returned with it and nothing else. After an edit, parse again and use the new sidecar. Passing an old sidecar to `write` with an edited tree is not safe: in the example below, a paragraph inserted at the top moves the table from `/children/0` to `/children/1`, the table entry no longer matches, and the continuation row is lost without a report.

```json
{ "path": "/children/0", "startByte": 0, "endByte": 11, "sourceFormat": "pipe", "blankLinesBefore": 0, "blankLinesAfter": 0 }
```

If the shifted paths happen to land on nodes of the same type, the writer may apply facts to the wrong node instead.

**A sidecar does not survive a write.** The written source is a new input with its own layout.

**The tree wins.** A writer ignores a fact that contradicts the tree, a fact not defined for the node type of its entry, and an entry whose path names no node.

**Nodes without a position still get a range.** A cell joined from a continuation row has no `pos`, because its value is not one slice of the source. Its sidecar entry runs from the start of its first piece to the end of its last, so the range is not a position:

```crv
| a |
+ b |
```

```json
{"path":"/children/0/children/0/children/0/children/0","startByte":1,"endByte":10,"wraps":[{"line":1,"path":"/children/0/children/0/children/0/children/0/children/0/children/0","offset":2}]}
```

The cell's text is `a b`, and the wrap says the fragment of the first continuation row starts at byte 2 of that text value.

**Input that is not UTF-8.** For the bytes `61 FF 62`, the sidecar has `"encoding": "base64"` and `"source": "Yf9i"`, and its ranges count the bytes as given, so they still equal `pos`. A string with an unpaired surrogate is not byte input: it keeps `"utf-8"` and holds U+FFFD in place of the surrogate.

**Byte-order marks and line endings.** For `U+FEFF`, `a`, CRLF, `b`, LF, the sidecar reports `"bom": true` and `"lineEndings": "mixed"`, and the paragraph entry starts at byte 3, after the three bytes of the mark.

**Changed since 0.1.** The version is 2 instead of 1, and the 0.1 fixture file `resources/ast-source-layout-fixtures.json` is replaced by the sidecars in `spec/0.2/trees/layouts.json`. There is no `leadingPipe` or `trailingPipe`, since every 0.2 table row starts and ends with a pipe. The `explicit` continuation style and the `continuation` and `detached` attachments are gone with the 0.1 `+` continuation marker.

**Specification (external):** [Source layout: what the sidecar is](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md#what-the-sidecar-is), [shape](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md#shape), [facts moved out of the tree](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md#facts-moved-out-of-the-tree), [measured facts carried over](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md#measured-facts-carried-over), [defaults](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md#defaults), [writer: the sidecar](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#the-sidecar), [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [`layout-schema.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/layout-schema.json).
