---
description: The Carve decision trace - stable step ids for block ownership, a versioned JSON-lines record per decision, and the trace-diff tool that finds where an engine first leaves the spec model.
---

# Decision trace

An HTML diff shows where the output first differs, which is often many lines
after the decision that caused it. A decision trace records each ownership
decision as it is made. Comparing two traces finds the first line an engine
decides differently from the spec model, and names the step and the clause
that decide it.

This page is informative. The steps and clauses are defined in PART 0 of
`resources/spec/01-layout.ebnf`; the record format is
[`resources/decision-trace-schema.json`](https://github.com/markup-carve/carve/blob/main/resources/decision-trace-schema.json).

## Step ids

The ids are stable. They are never renumbered, so a trace or a bug report that
cites one stays valid.

| Id | Step | Decides |
|---|---|---|
| `INPUT` | Normalize source | Frontmatter lines, before ownership |
| `S1` | Payload | A line inside an open code, raw or comment fence, or the fence's closer |
| `S2` | Owner | A lone `+` taken at a marker column |
| `S3` | Form | Not a trace step: its result is the record's `form` |
| `S4` | Lazy | A line that missed a frame and folds into the deepest open paragraph |
| `S5` | Apply | Everything else: blank, text, a leaf, an opener, a closer |
| `T` | Transition | The boundary table of CARVE-P0-003 that S5 applies |

The FAMILIES entries of PART 0 carry cell ids of the form `B-<family>-start`,
`B-<family>-keep` and `B-<family>-end`: what opens a block of that family, what
continues it and what ends it. The families are `item`, `list`, `term`, `dd`,
`footnote`, `quote`, `div`, `code`, `comment`, `table`, `caption` and `plus`.
A cell PART 0 gives no text of its own follows the general steps.

Inline ids (`I1` and later) are added once the inline pairing procedure is
normative. The schema already reserves the inline record.

## Format

A trace is JSON lines, version 1. The first line is a header:

```json
{"trace":"carve-decision-trace","version":1,"engine":"spec-model"}
```

Every later line is one record. A block record describes one source line, in
source order, with lines counted from 1 after input normalization:

| Field | Meaning |
|---|---|
| `line` | Source line, 1-based |
| `step` | `INPUT`, `S1`, `S2`, `S4` or `S5` |
| `owner` | Deepest open container holding the line after the step; for a closer, the container it closes |
| `rule` | Governing clause id, such as `CARVE-P0-006`, or `null` |
| `form` | What the line is: `blank`, `text`, `leaf`, `lazy`, `payload`, `closer`, `plus`, `frontmatter`, or the family it opens (`item`, `quote`, `footnote`, `dd`, `term`, `div`, `code`, `comment`) |
| `cell` | The FAMILIES cell id, when a family entry decided the line |
| `closed` | How many open containers the line closed by missing them, when it closed any. A closer's own container is its `owner`, not part of the count |
| `reached` | The deepest container the line reached, when it missed a deeper one |
| `plus` | The accepted `+` line this line follows; see below |

An owner path lists the open containers from the document down. Each container
is written as its kind and the line that opened it, so engines can compare paths
without sharing node indices: `doc/item:1/quote:2` is a quote opened on line 2
inside an item opened on line 1. The kinds are `quote`, `item`, `footnote`,
`dd`, `div`, `code` and `comment`. Raw fences use `code`; a `::: |` line block
uses `div`.

For this input:

```
- a
  > q
lazy
```

the spec model writes:

```json
{"trace":"carve-decision-trace","version":1,"engine":"spec-model"}
{"line":1,"step":"S5","owner":"doc/item:1","rule":"CARVE-P0-024","form":"item","cell":"B-item-start"}
{"line":2,"step":"S5","owner":"doc/item:1/quote:2","rule":"CARVE-P0-024","form":"quote","cell":"B-quote-start"}
{"line":3,"step":"S4","owner":"doc/item:1/quote:2","rule":"CARVE-P0-006","form":"lazy","reached":"doc"}
```

Line 3 reaches only the document, misses the item and the quote, and folds
into the quote's open paragraph.

A version bump is needed for any change that would make an existing reader
misread a record: a renamed field, a new meaning for a value, a new required
field. New optional fields and new `form` values do not bump the version.

## The spec model's trace

`parse(source, { trace })` in `scripts/spec/layout.mjs` appends block records to
the `trace` array. The records come from the ownership walk itself (rule A,
CARVE-P0-024), so every family and depth goes through the same four exits. With
no array the walk does no trace work. `scripts/spec/decision-trace.mjs` wraps
this as `modelTrace(source)` and reads and writes the JSON-lines form.

The line after an accepted `+` is recorded where it stands, with `plus` set to
the `+` line: the walk keeps its column and the block readers attach it to the
`+`'s container (CARVE-P9-067). A `+` on an item's or description's own marker
line has no record of its own: the block it takes at the marker column is
recorded inside that item or description, and the lines after that block are
recorded in its parent. A block it takes at column zero below an indented
marker is recorded inside the item or description too, with `plus` set to the
marker line. So is a block other than a paragraph that an item's or a
description's `+` takes between its marker and content columns. A paragraph
there is refused: it is recorded in the parent, and so are the lines the walk
folds after it.

The trace covers the ownership walk. The block readers that build the final
tree run after it, so a difference that only they make, such as how a table row
splits into cells, shows up in the output and not in the trace.

## Engine trace mode

An engine supports the trace by printing it for a file:

```sh
carve trace <file>
```

The output goes to stdout as JSON lines with the header above, and `engine`
names the engine. Records follow the schema and the same order as the model's.

## trace-diff

```sh
node scripts/trace-diff.mjs input.crv --engine rs
```

`trace-diff` runs the spec model and the engine on the same input and prints the
first record where they differ, with the records before it, the source line, both
decisions and the ids they cite. It exits 1 on a divergence and 0 when the traces
agree. It finds the engines where the other differential scripts do:
`CARVE_JS_DIR`, `CARVE_PHP_DIR` and `CARVE_RS_DIR`, or sibling checkouts.

- `--engine js|php|rs` picks the engine.
- `--engine-trace file.jsonl` compares against a trace saved earlier.
- `--context N` sets how many agreeing records to show, 3 by default.
- `--json` prints the divergence as one JSON object.

With no engine, or with an engine that has no trace mode yet, it says so and
prints the model's trace. A bug report can then start from the model's record
for the line where the outputs part.
