---
title: Parsed Document JSON Contract
description: A guide to the parsed-document JSON contract for implementers, linking each rule to its PART 12 clause.
---

# Parsed document JSON contract

This page is the complete interchange contract for parser, binding, and editor
implementers. For traversal, common fields, and safe application use, start with
[Parsed document JSON](./ast-json).

> [!TIP]
> Most application developers need only the five compatibility rules and API
> examples. The complete list of object types and fields is for parser, binding,
> and editor developers.

A parser represents a Carve document as an **abstract syntax tree (AST)**: a
tree of objects for headings, paragraphs, links, and other content. This page
defines its JSON form. One implementation can write the JSON and another can
read it.

- **Specification:** [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf), Part 12
- **JSON Schema:** [`ast-schema.json`](https://markup-carve.github.io/carve/ast-schema.json) ([source](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json))
- **Compatibility test:** `node scripts/ast-conformance.mjs`

## Why it exists

Editors, linters, converters, and document-comparison tools need structured
content, not finished HTML. A shared JSON format prevents each implementation
from assigning different field names to the same information.

## Reading the round-trip requirements

The following guide brings the existing requirements together; it adds no
serialization rule. A JSON round trip, a source round trip and an HTML
comparison answer different questions.

| Operation | What is preserved | Where the requirement lives |
| --- | --- | --- |
| Encode and decode a parsed AST | The parsed tree and its published fields. `text` and `escaped_text` remain distinct on the wire. Adjacent `text` nodes are already coalesced in the parsed tree. | Part 12 §§1a, 6 |
| Format Carve source and parse it again | The parsed document, except where the declared wrapper ceiling applies, using Part 11's equality modulo escaping: adjacent `text` and `escaped_text` runs compare by their characters. The writer is also byte-idempotent. | Part 11 clauses 1 and 1c |
| Write an imported or edited AST as Carve source | Source-spellable structure, subject to the declared ceilings and construct-specific fallbacks. A valid interchange tree can contain information Carve 0.1 source cannot spell. | Part 11 clauses 1b-1d; Part 12's node-specific clauses |
| Compare rendered HTML | The rendering required by the selected target. Matching HTML alone does not establish AST identity or satisfy the source writer's parse invariant. | Part 11 clauses 1 and 1a; Part 10 |

The distinction between the two equalities matters: collapsing escaped nodes
can be valid for the writer comparison while losing authored form in JSON.

Starting points in the source modules are [writer invariants](https://github.com/markup-carve/carve/blob/main/resources/spec/20-writer-invariants.ebnf),
[AST foundations](https://github.com/markup-carve/carve/blob/main/resources/spec/23-ast-foundations.ebnf)
and [AST contract](https://github.com/markup-carve/carve/blob/main/resources/spec/24-ast-contract.ebnf).
The [complete grammar](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf)
includes the remaining target and node-specific clauses; Part 12's fallback
matrix summarizes the target behavior of interchange-only shapes.

Representability depends on the shape and field values, not just the node type.
For example, a paragraph containing only an image loses its wrapper under the
writer's declared ceiling. A code block with content `"a"` survives JSON
unchanged, but writing a closed Carve fence adds a payload newline and reports
`field-unspellable` for `code_block.content` through a conversion-diagnostics
API. A `shortCaption` survives interchange but is omitted from Carve 0.1 source;
a bridge/API exposing conversion diagnostics should report that structural
loss under Part 12 §14. The sections
below retain the individual fallbacks and their reporting requirements.

Use [format bridges](./format-bridges) to distinguish AST-returning conversions
from source-writing conversions, and [HTML import](./html-import) for that
importer's preservation and diagnostic contract. These channels have different
jobs; a render-loss report does not replace a conversion-diagnostics report.

## Editing APIs

All three engines create and apply AST patches addressed by JSON Pointers.
Reversible forms carry inverse operations and document fingerprints for undo
and stale-edit checks. Check the patch API your engine exposes, and validate
untrusted operation names, values, and pointer paths before applying them.

carve-rs also exposes `parse_snapshot` and `reparse` for editor integrations.
The current snapshot API validates text changes and returns updated source,
AST, and change ranges, but still reparses the full document. It establishes a
stable incremental API boundary, not an incremental-performance claim.

## The shape in one document

```json
{
  "type": "document",
  "children": [
    {
      "type": "paragraph",
      "children": [
        { "type": "text", "value": "Hello ", "pos": { "startLine": 1, "endLine": 1, "startColumn": 1, "endColumn": 7, "startOffset": 0, "endOffset": 6 } },
        { "type": "strong", "children": [{ "type": "text", "value": "world" }] }
      ],
      "pos": { "startLine": 1, "endLine": 1, "startColumn": 1, "endColumn": 15, "startOffset": 0, "endOffset": 14 }
    }
  ],
  "srcByteLength": 15
}
```

Five rules carry most of the weight:

Captioned `figure` and `table` nodes may also carry an optional
`shortCaption` array of inline nodes. It is a structured publishing/navigation
label (for example Pandoc's list-of-figures caption), not another visible
caption. Carve 0.1 source has no spelling for it: parsers do not synthesize it,
ordinary HTML/plain/ANSI renderers ignore it, and format bridges preserve it
where their target has an equivalent field. This AST capability is independent
of source serialization: a Carve 0.1 writer omits the field, and conversion
APIs with diagnostics should report that loss. It is also independent
of the proposed `^^` author syntax.

A `small_caps` inline node carries `children` so format bridges can preserve
small caps from Pandoc, DocBook, TEI, and other structured formats. Carve
0.1 source has no spelling for the wrapper: parsers do not produce it, and the
canonical writer writes its children and preserves its attributes on an
ordinary attributed span. A conversion API with diagnostics should report that
the distinction was lost. Exporters may map it to a corresponding construct.
The node does not imply uppercasing or other text changes.

A `ruby` inline node carries an ordered, non-empty `pairs` array. Each pair has
a non-empty inline `base` and an inline `annotation`, which may be empty. This
keeps per-character and grouped readings without guessing from string lengths.
Carve 0.1 source has no ruby spelling. HTML and Markdown render native `<ruby>`;
plain, ANSI and canonical Carve output use `base(annotation)`, with checked
rendering reporting `ruby-flattened`. Outer attributes stay on `<ruby>` or on
the attributed span used by the Carve fallback.

A `math` node may carry an authored numbering `label`, such as `Equation` or
`Eq.`. Resolution leaves the label in place and gives a labeled display equation
a positive integer `number` from the same label bucket used by captions, unless
a `figure` around the math has a numbered caption that owns the number.
`attrs.id` remains the cross-reference identifier. Inline math may retain a
label from interchange, but it never receives a number. Carve 0.1 source does
not spell either field directly, so parsers do not synthesize them and
source-writing conversion reports their loss.

A `figure` may target a `table` ([`CARVE-P12-036`](./rules/imports-security-extensions)). That is a different document from a
table carrying its own `caption`: the wrapper renders `<figure>` and
`<figcaption>` around the table, while `table.caption` renders `<caption>`
inside it. Carve 0.1 source spells only the second, so the wrapper reaches a
tree through a format bridge - an HTML importer reading
`<figure><table>…<figcaption>` - and a canonical Carve writer loses it, writing
the table and its caption line. Conversion APIs with diagnostics should report
that loss. Every other captionable host - an image, a quote, a code block, a
display-math paragraph - becomes a `figure` from source, so its wrapper is
written back exactly. A composite figure's table panel is not this wrapper
either: a table inside a `::: figure` group is a plain `table` child of the
`figure_group` ([`CARVE-P12-035`](./rules/ast-interchange)), not a `figure` targeting one.

A `table` may likewise carry an optional `rowGroups` object ([`CARVE-P12-034`](./rules/imports-security-extensions)), which
partitions its `rows` into a head, any number of body groups and a foot:

```json
{
  "type": "table",
  "rows": ["..."],
  "rowGroups": {
    "headRows": 1,
    "bodies": [{ "headRows": 1, "bodyRows": 3, "rowHeadColumns": 1 }],
    "footRows": 1
  }
}
```

It holds **counts, never rows**: the counts consume `rows` in order and have to
account for every row exactly once, so the grouping can never contradict the
table's content. `rows` stays the one sequence every consumer reads. Absent
means the implicit structure renderers already derive - a leading run of header
rows as the head, everything after it as one body, no foot. Pipe-table parsers
synthesize explicit groups from `header-rows`, `footer-rows`, and the body
metadata attributes:

| Attribute | Meaning |
| --- | --- |
| `body-rows="2,3"` | Two bodies containing two and three data rows |
| `body-header-rows="1,0"` | One intermediate header row in the first body |
| `body-header-cols="1,"` | One row-header column in the first body; unset in the second |

Body header lists require `body-rows` and must have one entry per body. Missing
body header rows default to zero. Empty column entries preserve an absent
`rowHeadColumns`; `0` preserves an explicit zero. `body-rows=""` states no
bodies, while `body-rows=0` states one empty body. All row counts together must
partition the table exactly. Invalid body metadata stays ordinary attributes
and produces no explicit partition. Canonical source writers supply missing
metadata attributes and diagnose conflicting authored values.

HTML renders one `tbody` per body and promotes its intermediate column headers
and leading row-header columns. Plain and ANSI keep the flat rows. Section
attributes remain interchange metadata and their loss is diagnosed separately.


A `table` may also carry an optional positional `columns` array ([`CARVE-P12-039`](./rules/imports-security-extensions)). Each
entry describes the corresponding column and may hold `align` (`left`, `right`
or `center`), `valign` (`top`, `middle` or `bottom`), and `width`, a numeric fraction in `(0, 1]`. The array may be
shorter than the widest row; an omitted entry or field is unset. A cell's own
value wins over its column's value. Carve source spells the positional metadata
with a table's preceding `aligns`, `valigns`, and `widths` attributes; parsers
synthesize `columns` from those lists and canonical source writers retain the
most local available spelling. The column record keeps format bridges from
smearing column facts onto individual cells. A `table_cell` may likewise carry
`valign`; horizontal and vertical inheritance resolve independently.

**A continuation row stays in the tree as markers**
([`CARVE-P12-069`](./rules/ast-interchange)). A `+` row is joined into the row
above before inline parsing, so a cell's `children` hold the joined content.
Each join is a `cell_wrap` inline node carrying `line`, the continuation line
it came from, plus `row` when it sits in a cell spanning down from an earlier
row. `table_row.continuationLines` counts the row's `+` lines. Renderers output
`cell_wrap` as one space, except a cell's leading marker, which outputs nothing
and marks a cell a `+` line appended past the row's last column. The Carve
writer uses the markers to write the `+`
lines back.

When a join crosses a `code`, `raw_inline`, or `math` node, its `cellWraps`
array instead records each join as `{ offset, line, row? }`: the codepoint
offset of the joining space in `value` or `content`, plus the `line` and
`row` a `cell_wrap` would carry. For ``| `a | z |`` followed by
``+ b` | w |``, the code node has `value: "a | z b"` and
`cellWraps: [{ offset: 5, line: 1 }]`. The writer puts the part after each
offset on the `+` line the entry names, and `continuationLines` still counts
the join. When code-span padding stripping removed the joining space, the entry sits at
the padding boundary: offset 0 after the opening backtick run, or the value's
length before the closing run.

**The root carries three fields** - `type`, `children`, `srcByteLength` - plus
an optional `astVersion` on a bare tree
([`CARVE-P12-024`](./rules/ast-interchange)). Frontmatter and definitions are **block nodes in the tree**, not
root fields, because a root field cannot carry a position and both are source an
editor navigates to. A footnote or link reference definition is a child of the
**document** even when it was authored inside a container, because its scope is
the document wherever it was written. Its `pos` still says where that was. An
abbreviation definition is never hoisted: inside a container the line is
paragraph text (`CARVE-P12-026`).

**Field names are spec surface** (§3). `href`, `src`, `value`, `level`,
`children`. An implementation whose internals differ maps on the way out; it does
not export its internals, and it does not invent a synonym.

Author-choice fields preserve a spelling when it differs from the default.
`list.bulletChar` records `*` while absence means `-`; likewise,
`list.delim` records `)` while absence means `.`,
`thematic_break.marker` records `*` or `_` while absence means `-`, and
`list_item.taskState` records the task marker character while absence means the
default for the box (`x` when `checked` is true, a space when it is false), and
`table.separatorWidths` records the dash runs of an authored separator row while
absence means the header was spelled with `|=` cells instead. A
writer reproduces the recorded character and uses the default when the field is
absent, and a PARSE records nothing where the author wrote the default
(carve#2828): one document has one spelling in the tree, so a consumer comparing
AST JSON across engines or across versions is comparing like with like.
The marker records the CHARACTER only: `***` and `*****` are one spelling, and
no run length is recorded, on the same reasoning that took fence length off this
list in carve#1000.

`taskState` keeps the authored character; `checked` records the box. Earlier
formatters reduced `[-]`, `[_]`, `[>]`, and `[?]` to `[ ]` because the tree
stored only `checked` (carve#1866). The field now admits ` `, `x`, `-`, `_`,
`/`, `!`, `>`, and `?`. `_` is an authored open alias, `/` is progress, and `!`
is blocked. Only `x` requires `checked: true`; every other value requires
`checked: false`. The source grammar also admits `X`, which folds to `x`, so
the wire enum has eight characters, one fewer than the source grammar.

Task state does not
split a list: a `[ ]` item and a `[-]` item are one list, where a `-` bullet and
a `*` bullet are two.

**The tree is pre-resolve** ([`CARVE-P12-005`](./rules/ast-interchange)). It records what the author wrote, not what the
document resolves to. `[getting started][]` publishes a `link` carrying `ref` and
the `rawRef` source whether or not anything defines the label. Both stages
validate against the schema, which is how three engines came to disagree; the tie
goes to the stage that keeps `[x][]` alive through a format cycle and keeps
`[a][]` distinguishable from `[a](#a)`.

`href` is **not** the casualty of that. A resolved reference keeps its
destination:

```json
{ "type": "link", "href": "/start", "ref": "getting started", "rawRef": "[getting started][]" }
```

and `href` is empty only where nothing resolved the reference. The one
exception is a definition whose destination is itself empty (`[r]:`): the use
then carries `href: ""` and `resolved: true`, and an empty `href` without
`resolved` still means unresolved (contract 1.2). That is §5's
added-alongside rule - the same one that lets a resolved footnote reference keep
its label and gain its number - not a retreat from pre-resolve: the authored
construct is `ref` and `rawRef`, and it survives intact.

**A nested link and an autolink stay nodes** ([`CARVE-P12-007`](./rules/ast-interchange)). "Links never nest" is a
rendering rule - an anchor may not contain another anchor - so it binds the
renderer and not the encoder. A `link` or an `autolink` inside a link's label is
published as the node the author wrote, and every render target unwraps it at
the render seam, exactly as it already does for a `heading_ref`. The node
carries **no** non-anchor flag: a consumer that renders an anchor infers it from
context, the way it already does for the nested `heading_ref`. So a consumer
walking a link's `children` must expect a `link` or an `autolink` there and must
not emit a nested anchor for it. Rendered output does not move; what moves is
what a consumer of the tree receives.

It works this way because a consumer should not have to resolve references
itself. The definition does survive the trip: **[`CARVE-P12-029`](./rules/ast-interchange) gives `[label]: url` its own
`link_reference_definition` node**, hoisted to the document, so `/start` is not
stored only on the link. What an empty `href` would cost is the second stage -
every consumer that wanted to render that link would first have to collect the
definitions and match their labels, and one that skipped the step would render a
link to nothing. §5's added-alongside rule publishes the result next to the
authored construct instead of leaving it to be recomputed.

For the collapsed form `[getting started][]`, `ref` is the **derived** label
(`getting started`) - the label the reference resolves by. `rawRef` holds the
authored spelling, so the empty brackets are not lost.

Where the label carries inline markup the two readings of "derived" part, and
**`ref` is the resolution key** - the string the reference matched on, not the
label as authored. Given

```
# `code()` heading

[`code()` heading][]
```

the reference publishes:

```json
{ "type": "link", "href": "#code-heading", "ref": "code() heading", "rawRef": "[`code()` heading][]" }
```

The authored label is recoverable from `rawRef` by stripping its brackets; the
key is recoverable from nothing, because `href` holds the SLUG
(`#code-heading`), a different string from the key. So `ref` carrying the key
adds information, where carrying the authored label would only repeat `rawRef`.
Ruled at [carve#962](https://github.com/markup-carve/carve/issues/962).

**Type identifiers come from the [profiles vocabulary](/profiles)** ([`CARVE-P12-001`](./rules/ast-interchange)), and
are `snake_case` always. The AST carries a few types a profile cannot deny -
`document`, `smart_punctuation`, `literal_inline`, `tag`, `abbreviation_def` -
because denying them would mean nothing.

**Positions are required** (PART 12 §4), on every node except the root:

```json
"pos": { "startLine": 1, "endLine": 1, "startColumn": 2, "endColumn": 5, "startOffset": 1, "endOffset": 4 }
```

Lines and columns are 1-based, offsets 0-based, ends exclusive, and columns and
offsets count **Unicode codepoints** - not bytes, not UTF-16 code units. A
codepoint index always lands on a character boundary; the other two can point
inside a UTF-8 sequence or a surrogate pair, which lets a consumer slice a
document into invalid text.

A span **begins at the markup that opens the construct** - the `>` of a block
quote, the `#` of a heading, a list item's marker and the indentation that
places it, the `[` of a link. `pos` therefore round-trips to the source text
that produced the node, which is what a formatter, a linter and an editor
selection each need. Two nodes legitimately start at their content instead, and
both are stated in §4: the inner half of a combined `/*x*/`, whose span is the
outer one trimmed by the two-character delimiters, and a table cell, which runs
between the pipes because the `|` opens the row.

**Leading indentation belongs to the span only where it places the construct.**
A nested container may begin part way into that run, at its parent's content
column, because the run is what puts its marker where it is. A **leaf** has no
marker to place, so its span begins at the markup itself: a comment written at a
description body's content column begins at the `%`, not at the first space of
the indentation before it. Both readings used to satisfy this sentence, which is
what markup-carve/carve#1928 settled.

A span **ends immediately after the last source codepoint the construct owns**.
Closing delimiters and attached attributes are included; a following newline,
blank line, or unattached attribute block is not. Containers end at their
closer, or at their last *placed* child when they have no closer - which is what
a container whose closer is implicit has instead of one. Break nodes own their
line terminator and therefore end at column 1 of the following line.

**A hoisted sibling is not a child.** A definition written at a container's
content column is collected and hoisted to the document ([`CARVE-P12-029`](./rules/ast-interchange)), so it leaves the
container while its `pos` still points inside the source that container
encloses. Hoisting breaks the correspondence between tree nesting and source
nesting, and a span follows the **tree**:

```
- a

  [r]: /u
```

The `list` ends at offset 3, where its only `list_item` ends, and not at 14 -
the offsets between belong to the `link_reference_definition` alone. A container
that HAS a closer still ends at the closer, so a definition hoisted out of a
`:::` div remains a sibling whose span sits inside it; that overlap follows from
hoisting and is exempt. The trade is deliberate: a list reports a shorter extent
than the author typed, which is worse for folding, and an editor can recompute
the typed region from the item's content column where a consumer resolving one
offset to one node cannot recover an answer from two overlapping spans. Ruled at
[carve#1522](https://github.com/markup-carve/carve/issues/1522); the unattached
attribute block the sentence above excludes is the same rule reached from the
other side ([carve#1524](https://github.com/markup-carve/carve/issues/1524)).

**A hoisted definition may claim source inside the container it was authored
in**, whatever that container's extent. This is the one exception to the
non-overlap rule below, and it exists because [`CARVE-P12-029`](./rules/ast-interchange) makes the definition a child of
the document while PART 12 §4 keeps its `pos` pointing back at the container it was
written inside. Emptying that container does not withdraw the exception:

```
> [f]: ~
/
```

spans the emptied `block_quote` as `> ` and the hoisted
`link_reference_definition` over the whole line, so offsets 0 to 2 sit in two
document-level siblings at once and the definition reaches past its host rather
than sitting inside it. Ruled at
[carve#1571](https://github.com/markup-carve/carve/issues/1571), which leaves §7
and carve#1522 unchanged.

The exception is about the **pair**, not about a definition: it does not say a
hoisted definition overlaps nothing. Two definitions claiming the same source
overlap each other, and a definition claiming source inside a sibling it was not
authored in overlaps that sibling; both are findings. The host is the sibling
whose span **begins at or before** the definition's - a definition cannot have
been written inside a container that opens after it - and which **holds a child
list**, since nothing is authored inside a node that has none. So a
`link_reference_definition` and an `abbreviation_def` host nothing, while a
`footnote` does: a reference definition written on a footnote body's
continuation line is hoisted out of it, and that pair is two definition kinds.
A host reaching past its own content is still wrong under the paragraphs above;
the exception excuses an overlap, it does not extend a span.

**A `definition_list` is not an exception**, and it is named here because it
used to be one. It has no closer, so it ends at its last placed
`definition_term` or `definition_description`. A floating attribute is *scoped*
to the container that holds it, so an attribute line at a description's content
column is one the definition list consumed - but scope and extent are different
questions. Scope decides which blocks an attribute may reach; extent decides
which source a node claims. The bullet list one construct over already answers
it that way: `- a` / `  {.x}` / `tail` scopes the attribute to the item and
still excludes the line from the list's span. Ruled at
[carve#1530](https://github.com/markup-carve/carve/issues/1530), superseding
the extent half of
[carve#1281](https://github.com/markup-carve/carve/issues/1281).

**A container with no placed child at all spans its own markup and stops
there.** "Ends at its last placed child" says nothing when there is none, and a
container can be emptied - a definition written as an item's only content is
collected out of it ([`CARVE-P12-029`](./rules/ast-interchange)) and the item keeps no trace. In `* * [d]: u` the inner
`list_item` spans `* ` and ends there. Zero width is not the answer, because it
is a shape every consumer has to special-case and it discards the marker the
author typed; neither is the extent the author typed, which is what the
paragraph above rejects when a container does have children. Where the emptied
container ran over several lines, the markup it spans is the markup that opened
it, on the first of them.

Tab expansion does not remove positions from a whole line or stanza.
Unchanged text on either side retains its exact source span. Synthesized
columns omit positions, as does a merged text value such as `tab gap` from
`tab<TAB>gap`, whose space has no matching source character.

**A container starts at its opening markup even where its first child is
unplaced**, rather than at the first child that does carry one: the end rule
asks where a container's content stops and the start rule asks where the
construct begins, and a construct begins at its own markup whether or not any
child was placed. Ruled at
[carve-rs#1247](https://github.com/markup-carve/carve-rs/issues/1247).

**A container ends at the markup that closes it even where its last child is
unplaced**, rather than at the last child that does carry one: the source
between them is that unplaced child's, and an unplaced child says nothing about
where the author closed the construct. Read as two statements about *markup* the
two halves are symmetric - a container starts at the markup that opens it and
ends at the markup that closes it - and "ends at its last placed child" is the
case for a container whose closer is **implicit**, where the last child's end is
what it has instead of a closer and the source past it belongs to a hoisted
sibling or to nothing. A closerless container whose last child is unplaced still
ends where its content ends. In

```
::: |
%%
tab	gap
:::
```

the stanza's `paragraph` ends at offset 16, where the tab-bearing line ends, and
not at 9 where the break above it ends: 9 is one past the terminator the break
owns, so that span would end immediately after a line terminator and drop the
stanza's own last line out of the paragraph holding it. Ruled at
[carve#1551](https://github.com/markup-carve/carve/issues/1551), which locates
[carve#1522](https://github.com/markup-carve/carve/issues/1522) rather than
overturning it.

A parent's span **contains every child's**. The two rules point the same way -
covering the opening markup is what puts a parent's start before its first
child's - and they are checked separately anyway, so that revisiting one cannot
silently retire the other.

An implementation that cannot place a node **omits `pos` rather than inventing
one**, and says so. Absent is a fact a consumer can act on; a wrong span is not.

A **reassembled** node - one the producer joined from pieces the source
separates, or synthesized outright - **must omit `pos`**, and it is conformant doing
so. A table cell continued on a `+` line, the hard break a line block makes
from a soft one, line-block content rebuilt around an indentation sentinel, and
a `text` run coalesced across such a gap all have values that are not a slice of
the source at any offset, so no true span exists. The exemption is narrow: it
covers nodes that *cannot* be placed, not nodes that have not been placed yet. The test is whether a true span EXISTS rather than whether one was written down.

## A block image is a field, not a shape you re-derive

A paragraph whose whole content resolves to a single image carries
`blockImage: true`:

```json
{ "type": "paragraph",
  "blockImage": true,
  "children": [ { "type": "image", "src": "/u", "alt": "a", "ref": "r", "rawRef": "[r]" } ] }
```

The block-image promotion phase (PART 9R R7) sets it and nothing else does.
Deciding it yourself means resolving references, because `![a][r]` is a block
image only where `[r]` is defined. On ingest, trust the field where it is
present and run promotion only where it is absent; absence means the producer
did not run the phase, not "ordinary paragraph". A `^ ` line after the image
binds as its caption only where the paragraph is promoted, so

```carve
![a][r]
^ cap
```

is a `figure` where `[r]` is defined and one paragraph holding both lines where
it is not. `fmt` writes the source spelling, so promotion never shows in its
output. See
[`CARVE-P12-043`](./rules/ast-interchange), [`CARVE-P12-044`](./rules/ast-interchange) and [`CARVE-P12-045`](./rules/canonical-writing).

## Adjacent text runs are coalesced

A node's children hold no two adjacent `text` nodes; `foo_bar_baz and
snake_case stay literal` is one text node, not four. The merge happens in
`parse(x)`, not in the encoder, or the round trip fails. `escaped_text` never
merges with `text`. A merged run keeps a `pos` only where its pieces are
contiguous in the source. JSON Schema cannot express this rule, so
`scripts/ast-conformance.mjs` checks it. See [`CARVE-P12-002`](./rules/ast-interchange).

## Nonbreaking spaces and literal Unicode

Each escaped space (`\ `) and each preserved line-block column is a
`{ "type": "non_breaking_space" }` node. HTML writes `&nbsp;`, Markdown U+00A0,
plain text and ANSI an ordinary space. Every string field holds literal
Unicode, so U+E000 and other private-use characters keep their authored
meaning. A tree stored under the earlier reading carries U+E000 where a space
was generated, and only reparsing the source repairs it. See [`CARVE-P12-004`](./rules/ast-interchange).

## Producing it

::: code-group

```bash [CLI]
carve --json document.crv        # any engine's binary
carve --from-json tree.json      # read an encoded AST back
```

```js [carve-js]
import { parse, toAstJson } from '@markup-carve/carve'

const json = toAstJson(parse(source))
```

```php [carve-php]
use MarkupCarve\Carve\Ast\AstCodec;

$json = AstCodec::encode((new Parser())->parse($source));
$ast  = AstCodec::decode($json);
```

```ruby [carve-rb]
require 'carve'

ast = Carve.parse(source)   # already a Hash tree in this shape
```

:::

## Validating your own output

The schema is a plain [JSON Schema 2020-12](https://json-schema.org/) document,
so any validator reads it. Point one at your serializer's output before you
publish it anywhere:

::: code-group

```js [Node]
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = await (await fetch('https://markup-carve.github.io/carve/ast-schema.json')).json()
const validate = new Ajv2020({ allErrors: true }).compile(schema)

if (!validate(myTree)) console.error(validate.errors)
```

```python [Python]
import json, urllib.request, jsonschema

url = "https://markup-carve.github.io/carve/ast-schema.json"
schema = json.load(urllib.request.urlopen(url))
jsonschema.validate(instance=my_tree, schema=schema)
```

:::

The schema answers "is this the right shape". It does not require `pos`,
because a schema cannot say "present unless the producer could not place this
node". Run `scripts/ast-conformance.mjs` for that half: it reports every node
without a position and slices the source with the spans that are present.

## Round trip

`parse(x)` serialized and deserialized must equal `parse(x)` (PART 12 §6). A
serializer that loses a field breaks a consumer one document later. Both halves
are checked over the whole corpus.

## A value the schema calls absent is normalized away

The schema describes a list's `start` as present only when it is not 1. When an
ingested tree carries `start: 1`, the encoder drops it, so every published tree
has the documented shape; `start: 0` and `start: 2` pass through. Normalizing
loses nothing, since both spellings describe the same document. See
[`CARVE-P12-042`](./rules/ast-interchange).

## Destinations are the author's text, not a sanitized URL

`href`, `src` and every other destination field carry what the author wrote,
verbatim, so the tree can hold a scheme no target may emit:

```
[click](javascript:alert(1))
```

serializes as

```json
{"type":"link","href":"javascript:alert(1)","children":[...]}
```

while every renderer emits `href=""` for the same document.

**A consumer that renders a destination owns the denylist.** The rule is the
URL-scheme denylist in [the security model](/security), and it binds every
target that emits a resolvable URL. If you feed the tree back through a
conforming engine, that engine applies the denylist for you. If you walk the
tree and build your own output, it does not. See [`CARVE-P12-008`](./rules/ast-interchange) and
[`CARVE-P12-009`](./rules/imports-security-extensions).

## Reading a tree you did not write

An ingest is a boundary, and PART 12 states its refusals once
([`CARVE-P12-068`](./rules/ast-interchange)): a typed, documented error naming what was wrong and where,
never truncation, a crash, a silent repair or a JSON library's own exception.
An ingest refuses:

- input nested deeper than its bound. It must accept anything its own parser
  produces at the nesting cap, and it derives its bound from that cap by the
  worst per-level cost of its encoding, since a list level costs four JSON
  levels where a block quote costs two ([`CARVE-P12-028`](./rules/ast-interchange));
- a property the schema does not name, at any node, named with its path. It
  does not drop or echo it ([`CARVE-P12-030`](./rules/ast-interchange));
- a root missing `type`, `children` or `srcByteLength`, carrying anything else,
  or typed as anything but `document`; a node whose `type` the schema does not
  name; and any payload that does not validate against the schema
  ([`CARVE-P12-031`](./rules/ast-interchange)). Node positions are read off the schema, and the check
  never looks inside `attrs.keyValues`, where `{type=widget}` is an ordinary
  attribute.

Two things are not refusals. A reader replaces every U+0000 in an ingested
string with U+FFFD before it reads the value for anything else, as the parser
does with source ([`CARVE-P12-041`](./rules/ast-interchange)). A `srcByteLength` that is present but wrong
is ignored.

The schema's unions do part of this work. A `children` array admits only
content blocks, so a `table_row` at the document level fails validation
([`CARVE-P12-046`](./rules/ast-interchange)). A reference node carries its target: `footnote_ref`
requires `label`, and an `id` there is refused like any other unnamed property
([`CARVE-P12-047`](./rules/ast-interchange)). A `citation` exists only as an item of a `citation_group`
([`CARVE-P12-059`](./rules/ast-interchange)).

## Tables: spans, cells and counts

A cell that the span walk extended carries `colspan` and `rowspan` beside the
markers that produced them; absent means 1 ([`CARVE-P12-048`](./rules/ast-interchange)). A tree from HTML
or Pandoc carries counts and no markers, and a reader derives the covered
positions from the counts; where markers and counts disagree, the markers win
([`CARVE-P12-061`](./rules/ast-interchange)). A cell holds either inline `children` or block `blocks`,
never both; Carve source spells only the first, and Markdown, plain and ANSI
flatten `blocks` onto one line and report it ([`CARVE-P12-049`](./rules/ast-interchange)).

## Extensions and the envelope

A `block_extension` carries a qualified `name`, a required `fallback` block and
an optional `payload`. A reader that does not know the name renders the
fallback and reports the loss ([`CARVE-P12-055`](./rules/ast-interchange)).

At a storage or process boundary, wrap the tree in an envelope:

```json
{
  "astVersion": "1.2",
  "vocabulary": "https://markup-carve.org/ast/core",
  "extensions": [{ "id": "https://markup-carve.org/ext/citations", "version": "1" }],
  "document": { "type": "document", "children": [], "srcByteLength": 0 }
}
```

The tree inside does not change. `carve --json` writes it bare, with
`astVersion` on the root so a reader of bare trees can check the version; a
reader accepts a bare tree without one.
`astVersion` is the contract's version, not the language's: a reader refuses a
higher major or minor than it implements, and a required extension it does not
implement, with an error naming both versions ([`CARVE-P12-056`](./rules/ast-interchange)).

Contract 1.2 adds three optional fields and changes no existing reading:
`resolved: true` on a reference use whose definition has an empty destination,
`astVersion` on a bare tree's root, and `form` (`"block"`, `"line"` or
`"braced"`) on `comment`. A writer emits `form` beside `block` and `delimited`,
and a reader refuses a comment where the three disagree.

## Containers and line blocks

An ordinary `:::` container is a `div` when it is anonymous, a `directive` when
its kind names generated content (`bibliography`, `footnotes`, `glossary`,
`index`, `references`, `toc`), and an `admonition` otherwise. A directive always
publishes `children` and may carry a `title` ([`CARVE-P12-057`](./rules/ast-interchange)).

A `line_block` may carry `lines`: for each stanza, RFC 6901 pointers naming
where each line stops. Here the boundary sits inside the `strong` and the
trailing `\` closes nothing, so the stanza has two lines:

```carve
::: |
*Roses are red
Violets are blue*\
:::
```

```json
{ "type": "line_block",
  "children": ["..."],
  "lines": [["/children/0/children/1", "/children/-"]] }
```

Without `lines`, splitting `children` on `hard_break` approximates them ([`CARVE-P12-058`](./rules/ast-interchange)).

## Where the nodes are, as data

Which fields of a node hold other nodes depends on the type carrying them:
`content` is a node list on `inline_extension` and a string on `code_block`.
[`node-roles.json`](https://markup-carve.github.io/carve/node-roles.json) reads
that off the schema and is published beside it:

```json
{ "figure": { "target": { "role": "single-node", "admits": ["block_quote", "code_block", "image", "paragraph", "table"] } },
  "table":  { "rows": { "role": "node-sequence", "admits": ["table_row"] },
              "columns": { "role": "record-sequence" } } }
```

`node-sequence` is an array of nodes, `single-node` is one node, and
`record-sequence` is an array of plain records with no `type`. A field holding a
scalar has no role. Copy this table rather than deriving your own.

## Sidecars

Source layout, node identity, annotation ranges and provenance travel beside the
tree, never in it, and only when the caller asks. Each validates against its own
schema, addresses nodes by RFC 6901 pointers into the accompanying tree, and
does not survive a canonical write ([`CARVE-P12-067`](./rules/ast-interchange)). See
[source layout](./ast-source-layout) and [`CARVE-P12-032`](./rules/imports-security-extensions), [`CARVE-P12-060`](./rules/ast-interchange),
[`CARVE-P12-062`](./rules/ast-interchange) and [`CARVE-P12-063`](./rules/ast-interchange).

## What is not in it

Formatter-internal nodes are not serialized, and an unresolved reference stays a
`link`, so no node carries pre-escaped text. Resolution results a consumer would
otherwise recompute are serialized beside the authored construct: footnote
numbers, caption numbers and generated heading ids. A heading id is not a
function of its heading, since dedup depends on every heading before it
([`CARVE-P12-023`](./rules/ast-interchange)).

## Definition lists

A definition list's `items` hold the `<dt>` / `<dd>` sequence as nodes, in
document order:

```json
{"type": "definition_list", "items": [
  {"type": "definition_term", "children": [ ... ]},
  {"type": "definition_term", "children": [ ... ]},
  {"type": "definition_description", "children": [ ... ]}
]}
```

A run of terms belongs to the descriptions that follow it, so the grouping is
derivable and is not published. A `definition_list` may carry `loose: true`,
meaning every description renders its children as blocks; absent, each
description derives its wrapper from its own block count. See
[`CARVE-P12-027`](./rules/ast-interchange).

## Composite figures

`::: figure` produces a `figure_group` whose `children` are ordinary blocks in
source order; its panels are the `figure` and `table` nodes among them, and its
optional `caption` is the group caption. Tell it from a `figure` by `type`, not
by probing for `target` ([`CARVE-P12-035`](./rules/ast-interchange)).

## Citations

A `[@key]: entry` line is a `citation_definition` node carrying `key`, inline
`children` and the metadata block as `attrs` ([`CARVE-P12-037`](./rules/imports-security-extensions)). Each item of a
`citation_group` is a positioned `citation` node ([`CARVE-P12-038`](./rules/imports-security-extensions)) and may
carry its own `mode`; a group's `mode` is the authored shorthand, and a reader
refuses a group with `mode` where an item lacks it ([`CARVE-P12-053`](./rules/ast-interchange)). A
`citation` never appears outside a group ([`CARVE-P12-059`](./rules/ast-interchange)).

## Code block payload line endings

`code_block.content` is literal payload text. A closed fence containing `a`
publishes `"a\n"`; an imported code element containing `a` without a final
break publishes `"a"`, and readers keep the two apart. A canonical Carve fence
needs a break before its closer, so writing `"a"` adds one and reports
`field-unspellable` for `code_block.content`. `raw_block.content` follows the
same rule. Trees stored under the earlier encoding, which omitted the last
line's break, cannot be told apart from new ones by their strings; migrate them
from source. See [`CARVE-P12-064`](./rules/ast-interchange) and [`CARVE-P12-065`](./rules/ast-interchange).

`resources/ast-code-content-fixtures.json` and
`resources/ast-code-payload-samples.json` pin the parsed values the engines are
checked against.

<!-- BEGIN GENERATED AST FALLBACK MATRIX -->
## Interchange fallback matrix

Generated from [the checked summary table](https://github.com/markup-carve/carve/blob/main/resources/spec/23-ast-foundations.ebnf). The cited clauses prevail if the summary disagrees. These wrapper/field forms have no Carve 0.1 core source spelling. Brackets restrict a row's scope. Detailed algorithms, attribute exceptions, diagnostic targets, API conditions and reporting strength remain in the cited PART 12 clauses. The diagnostic column names known codes with the targets named by the clauses; `clause` leaves the code/channel to the cited clauses, including cross-clause channel assignments. Unlisted diagnostic targets and `unspecified` action cells add no ruling.

| Shape | Rule | Carve | HTML | Markdown | Plain | ANSI | Diagnostic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `figure.shortCaption,table.shortCaption` | [`CARVE-P12-033`](https://github.com/markup-carve/carve/blob/main/resources/spec/24-ast-contract.ebnf#L342) | `omit_field` | `ignore_field` | `unspecified` | `ignore_field` | `ignore_field` | `clause` |
| `figure.target[table]` | [`CARVE-P12-036`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L2) | `table_caption` | `figure` | `unspecified` | `unspecified` | `unspecified` | `clause` |
| `table_cell.blocks` | [`CARVE-P12-049`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L367) | `unspecified` | `cell_blocks` | `flatten_blocks` | `flatten_blocks` | `flatten_blocks` | `field-unspellable (Carve,Markdown,Plain,ANSI)` |
| `table.rowGroups[attrs]` | [`CARVE-P12-034`](https://github.com/markup-carve/carve/blob/main/resources/spec/24-ast-contract.ebnf#L377) | `omit_field` | `unspecified` | `omit_field` | `omit_field` | `omit_field` | `field-unspellable (Carve,Markdown,Plain,ANSI)` |
| `small_caps` | [`CARVE-P12-050`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L414) | `unwrap` | `smallcaps_span` | `smallcaps_span` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `section` | [`CARVE-P12-052`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L2) | `unwrap` | `section` | `unwrap` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `ruby` | [`CARVE-P12-054`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L54) | `parenthesized_pairs` | `ruby` | `ruby` | `parenthesized_pairs` | `parenthesized_pairs` | `ruby-flattened (Carve,Plain,ANSI)` |
| `block_extension[unknown name]` | [`CARVE-P12-055`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L91) | `fallback` | `fallback` | `fallback` | `fallback` | `fallback` | `clause` |

- `omit_field`: omit the field.
- `ignore_field`: ignore the field; render the full caption once.
- `unspecified`: not specified by this row.
- `table_caption`: write the table and one caption slot (PART 12 §17).
- `figure`: figure around table with outer figcaption.
- `flatten_blocks`: flatten blocks into one cell line (PART 12 §27).
- `cell_blocks`: render blocks in td/th.
- `unwrap`: render children without this wrapper.
- `smallcaps_span`: span class="smallcaps".
- `section`: section element.
- `parenthesized_pairs`: base(annotation) in pair order.
- `ruby`: ruby with rt and generated rp.
- `fallback`: render the declared fallback (PART 12 §33); the row applies only when the reader does not know the extension name and the envelope does not mark it required.
<!-- END GENERATED AST FALLBACK MATRIX -->
