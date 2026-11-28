---
description: Tracing parser decisions while implementing Carve 0.2.
---

# Decision trace

An HTML diff shows where the output first differs, which is often many lines
after the decision that caused it. A decision trace records each ownership
decision as it is made. Comparing two traces finds the first line an engine
decides differently from a reference, and names the step and the clause that
decide it.

Carve 0.2 does not specify a trace format, step ids or a `carve trace` command:
the 0.2 tooling chapter defines the portable command line, and `trace` is not
part of it. The 0.1 trace described below stays on the `0.1` branch, together
with its spec model and `trace-diff` script. Its idea carries over to 0.2; its
rule ids and step names do not.

## Reporting a 0.2 mismatch

For a 0.2 mismatch, report the conformance case id, the input, the options, the
expected output, the actual output and the deciding `C2-` clause. A local engine
trace is useful for diagnosis, but its fields and step names are implementation
details of that engine. The [block ownership rules](./ownership-procedure) and
the AST positions give portable points of comparison: two engines that disagree
on output almost always disagree first on which container owns a line, and a
position in the tree names that line without sharing node indices.

## The 0.1 decision trace

Everything in this section describes 0.1 tooling. The steps and clauses were
defined in PART 0 of the 0.1 `resources/spec/01-layout.ebnf`, and the record
format is
[`resources/decision-trace-schema.json`](https://github.com/markup-carve/carve/blob/0.1/resources/decision-trace-schema.json)
on the `0.1` branch. Do not compare its rule ids with a 0.2 parser.

### Step ids

The ids are stable. They are never renumbered, so a trace or a bug report that
cites one stays valid.

| Id | Step | Decides |
|---|---|---|
| `INPUT` | Normalize source | Frontmatter lines, before ownership |
| `S1` | Payload or erasure | A line inside an open code, raw or comment fence, the fence's closer, or an eligible one-line comment or definition erased before layout |
| `S2` | Owner | A lone `+` taken at a marker column |
| `S3` | Form | Not a trace step: its result is the record's `form` |
| `S4` | Lazy | A line that missed a frame and folds into the deepest open paragraph |
| `S5` | Apply | Everything else: blank, text, a leaf, an opener, a closer |
| `T` | Transition | The boundary table of CARVE-P0-003 that S5 applies |

The rows of PART 0's B-CELLS table carry cell ids of the form `B-<family>-start`,
`B-<family>-keep` and `B-<family>-end`: what opens a block of that family, what
continues it and what ends it. The families are `item`, `list`, `term`, `dd`,
`footnote`, `quote`, `div`, `code`, `comment`, `table`, `caption` and `plus`.
A cell PART 0 gives no text of its own follows the general steps.

Inline ids (`I1` and later) were reserved for the time the inline pairing
procedure became normative. The schema already reserves the inline record.

The `S2` step and the `plus` family exist because of the 0.1 `+` continuation
line. 0.2 removed that line: a block that belongs to an item is indented under
it instead (see [Upgrading from 0.1](./upgrade-0-2)).

### Format

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
| `cell` | The B-CELLS id, when a family guard decided the line |
| `closed` | How many open containers the line closed by missing them, when it closed any. A closer's own container is its `owner`, not part of the count |
| `reached` | The deepest container the line reached, when it missed a deeper one |
| `plus` | The accepted `+` line this line follows; see below |

An owner path lists the open containers from the document down. Each container
is written as its kind and the line that opened it, so engines can compare paths
without sharing node indices: `doc/item:1/quote:2` is a quote opened on line 2
inside an item opened on line 1. The kinds are `quote`, `item`, `footnote`,
`dd`, `div`, `code` and `comment`. Raw fences use `code`; a `::: |` line block
uses `div`.

For this 0.1 input:

```text
- a
  > q
lazy
```

the 0.1 spec model writes:

```json
{"trace":"carve-decision-trace","version":1,"engine":"spec-model"}
{"line":1,"step":"S5","owner":"doc/item:1","rule":"CARVE-P0-024","form":"item","cell":"B-item-start"}
{"line":2,"step":"S5","owner":"doc/item:1/quote:2","rule":"CARVE-P0-024","form":"quote","cell":"B-quote-start"}
{"line":3,"step":"S4","owner":"doc/item:1/quote:2","rule":"CARVE-P0-006","form":"lazy","reached":"doc"}
```

Line 3 reaches only the document, misses the item and the quote, and folds
into the quote's open paragraph.

The same source reads differently in 0.2. A quote no longer interrupts a
paragraph, so line 2 is a lazy line of the item's paragraph and opens no quote,
and the item holds one paragraph of three lines:

<!-- carve-sample {"lint":"block-opener-without-blank-line: the quote-shaped line under item text is the point of the sample"} -->
::: compare
```crv
- a
  > q
  lazy
```
```html
<ul>
  <li>a
&gt; q
lazy</li>
</ul>
```
:::

`carve fmt` indents `lazy` to the item's content column, which renders the
same HTML, and lint reports the quote-shaped line as
`block-opener-without-blank-line`. To keep the 0.1 reading, put a blank line
before the quote.

A version bump is needed for any change that would make an existing reader
misread a record: a renamed field, a new meaning for a value, a new required
field. New optional fields and new `form` values do not bump the version.

### The spec model's trace

`parse(source, { trace })` in `scripts/spec/layout.mjs` appends block records to
the `trace` array. The records come from the ownership walk itself (rule A,
CARVE-P0-024), so every family and depth goes through the same four exits. With
no array the walk does no trace work. `scripts/spec/decision-trace.mjs` wraps
this as `modelTrace(source)` and reads and writes the JSON-lines form. Both
scripts exist only on the `0.1` branch.

The line after an accepted `+` is recorded where it stands, with `plus` set to
the `+` line: the walk keeps its column and the block readers attach it to the
`+`'s container (CARVE-P9-067). A `+` on an item's or description's own marker
line has no record of its own: the block it takes at the marker column is
recorded inside that item or description. After that block, a blank line and a
paragraph line at its content column are recorded in it too, as the readers
keep them there. When that block is an unclosed fence, the readers end it at
the block, and every line at the content column after it is recorded as the
item's or description's own body (a sub-list, a quote, a heading). Any other
line after the block is recorded in its parent. A line at any other column
refuses the `+` (CARVE-P9-067). The `+` then traces like any letter, so the line
is recorded where a line after that letter would be, with no `plus`: `- +` /
` # h` records the heading in the parent, and `- +` / `  x` records `x` in the
item.

A list marker of another kind under an item's paragraph, at the content column
of the item's parent, starts a new list (0.1 PART 9 §10 I2). The walk folds it
into the paragraph, but the trace records it as an item in the parent, and the
markers after it as that list's items.

The readers measure each later line of that list at the column the walk wrote
it, and the walk may have opened a frame for it inside an item they already
closed. A marker at one of the list's columns is a sibling, one at or past the
deepest content column is a child, one left of the list's own column, at the
parent's content column or right of it, starts a new list in the parent, and
any other marker is text of the deepest item's paragraph. A marker after a
paragraph the `+` refused continues that paragraph, unless the paragraph is an
item's and the marker stands at that item's content column, or the marker
returns past the paragraph's owner.

The trace covers the ownership walk. The block readers that build the final
tree run after it, so a difference that only they make, such as how a table row
splits into cells, shows up in the output and not in the trace.

### Engine trace mode

A 0.1 engine supported the trace by printing it for a file:

```sh
carve trace <file>
```

The output goes to stdout as JSON lines with the header above, and `engine`
names the engine. Records follow the schema and the same order as the model's.
The 0.2 command line has no `trace` command.

### trace-diff

```sh
node scripts/trace-diff.mjs input.crv --engine rs
```

`trace-diff`, on the `0.1` branch, runs the spec model and the engine on the
same input and prints the first record where they differ, with the records
before it, the source line, both decisions and the ids they cite. It exits 1 on
a divergence and 0 when the traces agree. It finds the engines where the other
differential scripts do: `CARVE_JS_DIR`, `CARVE_PHP_DIR` and `CARVE_RS_DIR`, or
sibling checkouts.

- `--engine js|php|rs` picks the engine.
- `--engine-trace file.jsonl` compares against a trace saved earlier.
- `--context N` sets how many agreeing records to show, 3 by default.
- `--json` prints the divergence as one JSON object.

With no engine, or with an engine that has no trace mode yet, it says so and
prints the model's trace. A bug report can then start from the model's record
for the line where the outputs part.

**Specification (external):** [Tooling, commands](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#commands), [Conformance corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md), [AST positions](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#positions), [Block syntax, paragraphs and interrupters](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters) (C2-B-011 to C2-B-024).
