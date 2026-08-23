---
title: AST Exchange Format
description: The JSON encoding of a parsed Carve document - one shape across every implementation, with a published JSON Schema.
---

# AST Exchange Format

A parsed Carve document is **exchangeable**. One implementation serializes it,
another reads it, and neither has to know which produced it.

- **Normative text:** [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf), PART 12
- **Machine-readable:** [`ast-schema.json`](https://markup-carve.github.io/carve/ast-schema.json) ([source](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json))
- **Conformance runner:** `node scripts/ast-conformance.mjs` in this repo

## Why it exists

Every integration that is not "source to HTML" - an editor, a linter, a
converter, a structural diff - needs the tree, not the output. Without a shared
encoding each of them pivots through HTML and re-parses it, and each
implementation invents its own field names. That already happened here: one
engine called a link's destination `href`, another `destination`, and nothing
noticed until a consumer read the wrong one.

The encoding turns an N×M integration problem into N+M.

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

A `figure` may target a `table` (§17). That is a different document from a
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
`figure_group` (§16), not a `figure` targeting one.

A `table` may likewise carry an optional `rowGroups` object (§15), which
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
synthesize the simple partition spelled by `header-rows` / `footer-rows`, and
ListTable-aware converters may additionally synthesize header-led body groups
and row-header columns. Partitions without those landmarks remain
interchange-only. Like `shortCaption`,
it exists so a richer table model (several `tbody` groups, a group's own
intermediate header rows, a foot, a count of leading row-header columns)
survives a format bridge. HTML renders source-spelled head/foot ranges;
plain and ANSI keep flattening the table.

A `table` may also carry an optional positional `columns` array (§19). Each
entry describes the corresponding column and may hold `align` (`left`, `right`
or `center`), `valign` (`top`, `middle` or `bottom`), and `width`, a numeric fraction in `(0, 1]`. The array may be
shorter than the widest row; an omitted entry or field is unset. A cell's own
value wins over its column's value. Carve source spells the positional metadata
with a table's preceding `aligns`, `valigns`, and `widths` attributes; parsers
synthesize `columns` from those lists and canonical source writers retain the
most local available spelling. The column record keeps format bridges from
smearing column facts onto individual cells. A `table_cell` may likewise carry
`valign`; horizontal and vertical inheritance resolve independently.

**The root carries exactly three fields** - `type`, `children`, `srcByteLength`
(PART 12 §7). Frontmatter and definitions are **block nodes in the tree**, not
root fields, because a root field cannot carry a position and both are source an
editor navigates to. A definition is a child of the **document** even when it was
authored inside a container - footnote, link reference and abbreviation alike -
because its scope is the document wherever it was written. Its `pos` still says
where that was.

**Field names are spec surface** (§3). `href`, `src`, `value`, `level`,
`children`. An implementation whose internals differ maps on the way out; it does
not export its internals, and it does not invent a synonym.

Author-choice fields preserve a spelling when it differs from the default.
`list.bulletChar` records `*` while absence means `-`; likewise,
`thematic_break.marker` records `*` or `_` while absence means `-`. A writer
reproduces the recorded character and uses the default when the field is absent.
The marker records the CHARACTER only: `***` and `*****` are one spelling, and
no run length is recorded, on the same reasoning that took fence length off this
list in carve#1000.

**The tree is pre-resolve** (§3a). It records what the author wrote, not what the
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

and `href` is empty only where nothing resolved the reference. That is §5's
added-alongside rule - the same one that lets a resolved footnote reference keep
its label and gain its number - not a retreat from pre-resolve: the authored
construct is `ref` and `rawRef`, and it survives intact.

**A nested link and an autolink stay nodes** (§3a). "Links never nest" is a
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
itself. The definition does survive the trip: **§10 gives `[label]: url` its own
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

**Type identifiers come from the [profiles vocabulary](/profiles)** (§1-2), and
are `snake_case` always. The AST carries a few types a profile cannot deny -
`document`, `smart_punctuation`, `literal_inline`, `tag`, `abbreviation_def` -
because denying them would mean nothing.

**Positions are required** (§4), on every node except the root:

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

A span **ends immediately after the last source codepoint the construct owns**.
Closing delimiters and attached attributes are included; a following newline,
blank line, or unattached attribute block is not. Containers end at their
closer, or at their last *placed* child when they have no closer - which is what
a container whose closer is implicit has instead of one. Break nodes own their
line terminator and therefore end at column 1 of the following line.

**A hoisted sibling is not a child.** A definition written at a container's
content column is collected and hoisted to the document (§7), so it leaves the
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
non-overlap rule below, and it exists because §7 makes the definition a child of
the document while §4 keeps its `pos` pointing back at the container it was
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
collected out of it (§7) and the item keeps no trace. In `* * [d]: u` the inner
`list_item` spans `* ` and ends there. Zero width is not the answer, because it
is a shape every consumer has to special-case and it discards the marker the
author typed; neither is the extent the author typed, which is what the
paragraph above rejects when a container does have children. Where the emptied
container ran over several lines, the markup it spans is the markup that opened
it, on the first of them.

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
a	b
:::
```

the stanza's `paragraph` ends at offset 12, where the tab-bearing line ends, and
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
separates, or synthesized outright - **must omit `pos`**. It is conformant doing
so**. A table cell continued on a `+` line, the hard break a line block makes
from a soft one, line-block content rebuilt around an indentation sentinel, and
a `text` run coalesced across such a gap all have values that are not a slice of
the source at any offset, so no honest span exists. The exemption is narrow: it
covers nodes that *cannot* be placed, not nodes that have not been placed yet.

## Adjacent text runs are coalesced

A node's children hold **no two adjacent `text` nodes**. Where parsing produced
a run of them, they join into one, concatenating `value` in order:

```
foo_bar_baz and snake_case stay literal
```

is one text node, not four. An implementation that splits wherever a delimiter
failed to open emphasis is publishing its parser's bookkeeping rather than the
document.

This is normative (§1a) because without it the interop requirement means very
little: two engines can publish 1 node and 4 for the same characters, both valid
against the schema, and "read another's output" degrades to "parses".
Coalescing is what makes the tree **canonical** for a given document - the same
argument PART 11 makes one layer down for canonical source form - and it is what
lets a divergence be measured node-for-node instead of argued about.

`escaped_text` is not `text` and does not merge with it: the two stay distinct
on the wire because an escape is authored form.

The merge is part of `parse(x)`, not of serialization. [§6](#round-trip)
requires `parse(x)` serialized and deserialized to equal `parse(x)`, so joining
runs in the encoder while leaving the tree split satisfies this rule and breaks
that one on the same document - what comes back holds one node where the tree
held three.

A merged run keeps a `pos` only where its pieces are **contiguous** in the
source. Where they are not - the `<` and `>` of an autolink unwrapped inside a
link label, the delimiter between two halves of a wrapped table cell - the
merged value is not a slice of the source at any offset, so the node carries no
position rather than one that selects the wrong text. §4 names that a permitted
category rather than a gap, so a merged run without a position is conformant.

The schema cannot express this - JSON Schema has no way to forbid two adjacent
array entries of the same shape - so it is checked by the shape comparison in
`scripts/ast-conformance.mjs`.

## U+E000 is a no-break space, on four fields

U+E000 **stands for a no-break space**. It is not the same node content as a
literal U+00A0 the author typed, which is published as itself.

> A consumer **MUST** map U+E000 to its target's no-break space, or to an
> ordinary space where the target has none, and **MUST NOT** emit it.

Four fields may carry it, and every one of them resolves to a no-break space in
the HTML renderer:

| field | how the sentinel gets there |
| --- | --- |
| `text.value` | an escaped space (`\ `), a line block's preserved indentation, an authored U+E000 |
| `code.value` | an authored U+E000 |
| `code_block.content` | an authored U+E000 |
| `literal_inline.content` | an authored U+E000 |

The three verbatim fields carry it only because the author typed the character,
but on the wire that is indistinguishable from a parser-resolved one, so the
rule is the same everywhere it appears.

**A line block's indentation is a run of the sentinel**, one per preserved
space. This is the source that gets missed, and it is the common one - an
escaped space is rare, indented verse is not.

```
::: |
a
    b
:::
```

The second line's four spaces are four U+E000 in the leading `text.value`, and
render as four no-break spaces:

```html
<div class="line-block">
  <p>a<br>
&nbsp;&nbsp;&nbsp;&nbsp;b</p>
</div>
```

`raw_block.content` is **deliberately not on the list**. Raw content is handed
to its target byte for byte, so a U+E000 in it is a byte the author put there
and a consumer must leave it alone; mapping it would corrupt the payload the
node exists to carry unexamined.

The cost of documenting one field out of four is measured: consumers in this
org passed the sentinel straight through into Pandoc JSON, and back into Carve
source in place of the `\ ` it came from ([carve#721][i721]). `carve-sile`
handed it to SILE, which drew the font's `.notdef` glyph - a visible box in the
PDF, no warning ([carve#1242][i1242]).

Private-use codepoints **above** U+E000 are writer-internal staging and never
reach a published value.

[i721]: https://github.com/markup-carve/carve/issues/721
[i1242]: https://github.com/markup-carve/carve/issues/1242

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

The schema answers "is this the right shape". It deliberately does **not**
require `pos`, because a JSON Schema cannot express "present unless the producer
genuinely could not place this node" - and a schema that failed every
partially-positioned engine outright would stop being useful for the shape. Run
`scripts/ast-conformance.mjs` for the other half: it reports every node without a
position, and slices the source with the spans that are there to check they cover
the text they claim.

## Round trip

`parse(x)` serialized and deserialized must equal `parse(x)` (§6). A serializer
that loses a field is not a lossy convenience; it is a consumer breaking silently
one document later. Both halves are checked over the whole corpus.

## A value the schema calls absent is normalized away

The schema describes a list's `start` as "First number of an ordered list, when
it is not 1". That sentence pins the PRODUCER, and every engine complies -
`1. a` yields a list with no `start` at all. §22 says the CONSUMER honors it too:
when an ingested tree carries `start: 1`, the encoder drops it, so every tree an
implementation publishes matches the documented shape.

§6's round trip is no argument against that. It is scoped to `parse(x)`, a
parsed tree, which never carries the value - reading it as "JSON to JSON is an
identity" extends it onto a payload no parser produced. What decides it is that
normalizing is **lossless**: `start: 1` and no `start` describe the same
document, and both render `<ol>` with no attribute, `1` being the HTML default.
Preserving the field keeps an inert value that makes the encoder's output depend
on where the tree came from.

The rule is not "drop `start` always". `start: 0` and `start: 2` are carried
through unchanged.

The value is unreachable from Carve source, so no corpus document can pin it and
the pin is a hand-built payload,
[`tests/an-ingested-default-start-is-not-re-emitted.test.mjs`](https://github.com/markup-carve/carve/blob/main/tests/an-ingested-default-start-is-not-re-emitted.test.mjs).
That blind spot is why the three engines drifted apart here unnoticed: carve-php
drops the field, carve-js and carve-rs re-emit it, and carve-rs additionally
spells it as `<ol start="1">`
([carve-js#1391](https://github.com/markup-carve/carve-js/issues/1391),
[carve-rs#1293](https://github.com/markup-carve/carve-rs/issues/1293)).

## Destinations are the author's text, not a sanitized URL

`href`, `src` and every other destination field carry what the AUTHOR wrote,
verbatim. §3a requires the tree to record the document rather than a rendering
of it, so a blanked destination would make it lossy - and the round trip above
would no longer hold.

That means the tree can contain a scheme no target is allowed to emit:

```
[click](javascript:alert(1))
```

serializes as

```json
{"type":"link","href":"javascript:alert(1)","children":[...]}
```

while every renderer in every engine emits `href=""` for the same document, in
HTML and in Markdown alike.

**A consumer that renders a destination owns the denylist.** The rule is the URL-scheme denylist in
[the security model](/security), and it is written to bind every target that
emits a resolvable URL - the argument there is that a scheme "blanked here and passed
through there is not blocked, it is deferred by one step", which applies to a
tool reading this format exactly as it applies to a Markdown target.

If you feed the tree back through a conforming engine, that engine applies the
denylist for you. If you walk the tree and build your own output, it does not.

## How deep an ingested AST may nest

Reading a serialized AST is a recursive descent over structure someone else
wrote, so it needs a bound for the same reason [parsing does](/security). §9
states the property rather than a number:

1. an implementation **must accept any AST its own parser can produce** at the
   nesting cap - `carve --json | carve --from-json` may not fail on a document
   the same build just parsed;
2. it **must reject deeper input with an error of its own** - not truncation,
   not a crash, not whatever the JSON library raised;
3. the bound **may be counted in any unit**, because 1 and 2 are the whole
   contract.

The trap is that an ingest bound is not in the same unit as the parser's cap,
and the conversion factor is not a constant. One AST level costs two JSON
structural levels for a blockquote or div (the object plus its `children`
array) and four for a list. Measured against carve-js at the cap of 200,
counting the root as level 1:

| shape | structural depth |
|---|---|
| blockquote chain | 406 |
| list ladder | 806 |
| table under blockquotes | 406 |

The exact figures shift by one with the counting convention; the ratio is the
point. A list ladder at the cap is four times the parser's own number.

So a bound must be **derived** from the parser's cap by the worst per-level
cost of the encoding, never restated as the same number. All three engines got
this wrong in a different way - carve-rs bounded structural depth by the AST
number and rejected its own encoder's output
([carve-rs#389](https://github.com/markup-carve/carve-rs/issues/389)), carve-php
inherited `json_decode`'s 512 and surfaced a raw `JsonException`
([carve-php#556](https://github.com/markup-carve/carve-php/issues/556)), and
carve-js had no bound at all until a `RangeError` somewhere past 1500
([carve-js#498](https://github.com/markup-carve/carve-js/issues/498)). Two of
the three rejected documents their own parser produces, which is why rule 1 is
first.

The root type is not a leniency point either: §7 fixes it at `document` and the
schema pins it as a `const`. Accepting `doc` means half-reading a ProseMirror
payload instead of rejecting it.

## U+0000 is replaced on ingest

A reader **replaces every U+0000 with U+FFFD** in every string value it
ingests, before it reads that value for anything else - before it looks for a
sentinel in it, before it uses it as a key, before it hands it to a renderer.
§21.

The subject is the **decoded value**, not the bytes of a JSON document. A
string reaches an ingest by two doors: decoded from JSON text, where the only
spelling that can carry the character is the `\u0000` escape, and handed in
directly by a host that built the tree in memory - carve-js's `fromAstJson`
takes a parsed object, carve-php's `AstCodec::decode` takes an array. The rule
is the same at both. It does not relax the JSON grammar: RFC 8259 forbids an
unescaped U+0000 inside a string, so a raw byte in JSON text is a syntax error
before any Carve rule is reached, and stays one.

This mirrors the parse boundary rather than adding a rule to the wire format.
Carve source gets the same replacement before its first line is read (grammar
PART 0 INPUT), which is why PART 9 section 29 carves U+0000 out of the C0 controls it
otherwise makes content. An AST is a second door into the same renderers; a
format that admitted the character would put an authored NUL and an ingested
one on different footings.

**The value is not refused.** §11 and §12 refuse an unknown property and a
deviant root because those are structure a producer got wrong, and repairing
them silently would accept attacker-controlled shape. This is the opposite
case: the replacement is what the parse boundary already does to the identical
string, so performing it is the documented reading rather than a repair.
Refusing would make an ingested document stricter than the same document
written as source.

### What it makes safe

A NUL is the natural internal sentinel precisely because no document can hold
one - and two engines reached for it while that guarantee held only on the
parse path.

| engine | the sentinel | what the ingest let through |
| --- | --- | --- |
| carve-rs | `\u0000carve:footnotes-placement\u0000` in rendered HTML | a text node carrying that string pulls the endnotes section into itself, `<p><section role="doc-endnotes">…</section></p>` ([carve-rs#1217][rs1217]) |
| carve-js | term and expansion joined on a NUL for the PART 11 section 10f abbreviation pair key | `("A"·NUL·"b", "c")` and `("A", "b"·NUL·"c")` key identically, and one occurrence of the first drops the SECOND definition line - deleting the author's text ([carve-js#1294][js1294]) |

Neither sentinel has to change once the rule holds. That is the point of
putting it at the boundary instead of patching each collision: a guarantee the
parser makes and the ingest does not is not a guarantee.

Before the rule, all three engines let a NUL through the ingest and then
disagreed about it (carve-js `8f83eea` and carve-php `b845640` measured
2026-08-22; carve-rs as recorded in carve-rs#1217). Every one emits it on html, markdown
and plain text; ANSI strips it, since it strips controls; and the canonical
writer splits three ways - carve-js and carve-rs **delete** it, so `fmt` is
silently lossy, while carve-php **emits** it.

**An importer is the same boundary**, and *should* do the same where the format
it reads has no rule of its own. Carve's Markdown importer performs the
replacement per CommonMark 2.3 ([carve-js#1293][js1293]); its BBCode importer
passes a raw NUL straight through into Carve output.

[rs1217]: https://github.com/markup-carve/carve-rs/issues/1217
[js1294]: https://github.com/markup-carve/carve-js/issues/1294
[js1293]: https://github.com/markup-carve/carve-js/pull/1293

## A property the schema does not name

`resources/ast-schema.json` closes every node with `additionalProperties: false`,
so a payload carrying a property no node type names is not a Carve AST. §11
says what an ingest does with one: **refuse it**, with a typed error naming the
offending property and the path it sat at. Not a silent drop, and not a
pass-through.

The pass-through is the answer that cannot be right, and it fails on the
engine's own contract rather than on taste. An implementation that copies a
wire record wholesale re-emits the unknown property when it serializes again,
so its own output stops validating - a consumer that reads a tree and publishes
it again emits something the format rejects, having been told nothing. Measured
before the rule landed, carve-js echoed 29 of 31 injected properties back
([carve-js#709](https://github.com/markup-carve/carve-js/issues/709)).

Refusing rather than dropping follows §9(b) one field down: "an ingest that
accepts a tree and then silently renders only part of it is the worst of the
three, because the caller is told nothing". If a later version gives that
property a meaning, an engine that dropped it rendered a document that says
something else and reported success.

Forward compatibility does not argue the other way. `parse` and the schema ship
in one build, so an unknown property means the payload came from a different
version, and no engine can render a field it does not implement whatever it
does with it. Refusing makes the mismatch visible where it can still be
handled.

**One narrow exception.** An implementation may accept a property it once
published itself, provided it decodes that property onto a field the schema
does name and documents it. `footnote.id` - what carve-js and carve-php
published before §7 settled on `label` - is the case this is written for. Such
a property is not one the ingest cannot understand, which is what the clause is
about; refusing it would not protect a caller from a half-read tree, it would
take away the only reader that reads those stored trees whole. The exception
does not extend to a property an implementation merely tolerates.

**Extension data needs a declared home, not the absence of a check.** Until the
schema names one, extension state on the wire is invalid for the same reason
any other unnamed property is, and an extension relying on a pass-through is
relying on one engine's leak.

All three engines refuse today
([carve-js#763](https://github.com/markup-carve/carve-js/pull/763),
[carve-rs#693](https://github.com/markup-carve/carve-rs/pull/693),
[carve-php#913](https://github.com/markup-carve/carve-php/pull/913)), and the
spec repo's `compare:impls` probe checks it across all three.

## The root shape is strict too

§11 above closes the fields inside a node; §12 closes the ROOT, and puts the
unknown-type refusal at decode. An ingest **must refuse**:

| payload | why |
|---|---|
| a root missing `type`, `children` or `srcByteLength` | §7 fixes the three and the schema marks them `required`; supplying a default turns a truncated document into a valid-looking one |
| a root carrying a fourth field | `document` is closed with `additionalProperties: false` like every other node, so §11 already covers it |
| a node whose `type` the schema does not name | **at decode**, not in a renderer - a formatter, a linter or a language server holds the tree and never reaches one |
| anything else the schema rejects | §12(d): the WHOLE payload is validated against `resources/ast-schema.json`, types and required fields together |

Same argument as §11, one level out: a reader that invents a missing field or
ignores an unexpected one has silently repaired attacker-controlled input, which
is the opposite of what an ingest boundary is for. The refusal has to be an error
of its own, naming what was wrong - not whatever the JSON library raised.

The last row is one clause rather than a list because ruling the rows one at a
time is what produced the state it replaces. After the first three landed and
all three engines agreed on them, a root `children` of `null` was still read as
an empty document by two of them, `attrs: {"class":"x"}` was accepted and
rendered by one, and `text.value: 7` rendered as `<p>7</p>` - silent nonsense
where a refusal is required. The schema already described every one of those;
nothing consulted it. Validate the payload against it and refuse with a typed
error, rather than agreeing leniencies field by field.

The cost is real and is the point: this rejects trees two engines accept today,
and every future addition to the schema becomes a potential rejection for a
producer that has not caught up. That is what makes the schema the contract
instead of a description of one.

The VALUE of `srcByteLength` is not checked. It is derivable and nothing depends
on it, so all three engines ignore it - §12 is about the field being **there**,
and §12(d) about its type and sign, not about the number being right.

One trap sits under the unknown-type rule, and it is worth knowing before you
implement it. `attrs.keyValues` is the schema's only free-form map, its keys are
ordinary attribute identifiers, and `type` is a legal one:

```
[x](/u){type=widget}
```

serializes an object literally shaped `{"type":"widget"}` inside the tree. An
implementation that refuses *any* object whose `type` it does not recognize
refuses a document its own parser just produced, which is what rule 1 above
forbids.

The unknown-type check belongs at **node positions**: the root, and every field
the schema fills with a node. That is not a fixed list of field names - which
fields hold nodes depends on the type carrying them, so `content` is a node list
on `inline_extension` and a verbatim string on `code_block` - so read it off the
schema. The one position it must never reach is inside `attrs.keyValues`, whose
values are strings and hold no nodes.

## What is not in it

Formatter-internal nodes (PART 11, and the `raw_text` case the profiles
vocabulary excludes) are not part of the document and are not serialized. Under
§3a nothing on the document side needs `raw_text` either: an unresolved
reference stays a `link` rather than reverting to literal source, so no node has
to carry text that must not be escaped again.

Resolution results a consumer could recompute - footnote numbering, caption
numbers, a generated heading id - **are** serialized, because recomputing them
means reimplementing the resolution rules. Those are **added alongside** the
authored construct, not substituted for it: a resolved footnote reference keeps
its label and gains its number, and a resolved reference link keeps its `ref` and
`rawRef` and gains its `href`.

A generated heading id is the strongest case of the three, and §5 names it for
that reason. It is not a function of the heading: dedup takes the next free
suffix in document order, so `# Notes` twice gives `Notes` and then `Notes-2`,
and deriving the second one means having replayed every heading before it. A
consumer holding only the tree - a table of contents, an LSP go-to-definition, a
cross-document index - cannot do that, so the id rides in `heading.attrs.id`
beside an authored `{#id}` rather than being left to be guessed. All three
engines publish it today. It was the largest entry the value declaration ever
carried - 45 documents, carve-js alone against the other two - and it was
deleted when carve-rs landed the last producer
([carve#750](https://github.com/markup-carve/carve/issues/750) is closed).

## Conformance status

Run `node scripts/ast-conformance.mjs` in this repo against sibling checkouts of
the engines. It reports two things a schema cannot: nodes with no position, and
spans that do not cover the text they claim.

The rows below are MEASURED state, so they are reconciled rather than trusted.
`tests/ast-json-claims.test.mjs` measures the carve-js row against the pinned
engine, and holds every row to the two ledgers that run's satellites fill in -
`resources/ast-position-waivers.txt` and `resources/ast-value-divergence.txt`.
A row may name an issue only where one of those still declares the debt.

| engine | shape | positions |
|---|---|---|
| carve-js | §3a conformant on the resolved form: publishes `href`, `ref` and `rawRef` together | every block and inline placed, except the categories §4 exempts: a coalesced `text` run, a table cell continued on a `+` line, and a verbatim run continued on a `+` line |
| carve-rs | §3a conformant on the resolved form: `ref` and `rawRef` survive resolution beside `href` | every block and inline placed, except the categories §4 exempts: a coalesced `text` run, a reassembled table cell, and a verbatim run continued on a `+` line |
| carve-php | §3a conformant on both forms: an unresolved reference is a `link` node, and the collapsed form carries the resolution key in `ref` beside `rawRef`, the same label the other two publish on every corpus document | recorded behind a parse option, enabled whenever it serializes; every block and inline placed, except the categories §4 exempts - a coalesced `text` run, a reassembled table cell, and a verbatim run continued on a `+` line |
| carve-rb / carve-py / carve-go / carve-wasm | publish carve-rs's bytes | whatever carve-rs records |

A third ledger, `resources/ast-extent-findings.txt`, records the other half of
§4: a span that is PRESENT and points at the wrong codepoint. Those findings are
produced by `checkStopsAtChildren` and its neighbours, which read the SOURCE
rather than another engine - the only way a rule every engine breaks the same
way can be seen at all, since the three-way panel compares the engines against
each other and reads a unanimous defect as agreement. Until
[carve#1637](https://github.com/markup-carve/carve/issues/1637) that reading was
theoretical: the findings reached a counter that could not fail, so a run printed
thirty of them per engine and exited green. There is no `permitted` status in
that file - a reassembled node has no honest span, which is why the position
waivers have one, and a span that exists and is wrong has no such reading - so
every line names the engine issue that will delete it, and the count fails when
it moves in either direction.

The gaps are listed rather than smoothed over on purpose: "six implementations"
is only a claim worth making if the disagreements are visible.

The **reassembled** regions in the positions column are not among them - §4 names
that category permitted, so a table cell or line-block region without a position
is conformant rather than owed. What is still a gap is anything else in that
column, and the test is whether a true span EXISTS rather than whether one was
written down.

The definition-list entry this paragraph used to name is fixed: carve-rs places
`definition_term` and `definition_description` today, checked over every corpus
document that contains one. So is the gap that replaced it - re-measured over 833
documents on 2026-08-07, the OWED half of `resources/ast-position-waivers.txt`
was EMPTY.

It did not stay empty. Re-measured on 2026-08-17 over 1131 documents, at
carve-js c8c8dc3, carve-rs d981df8 and carve-php d2e2fd6, that half holds one
defect again: carve-php drops the position of a line block's content where the
source's spaces became indentation sentinels, and carve-rs publishes the same
value WITH a span, so a true span exists
([carve-php#1351](https://github.com/markup-carve/carve-php/issues/1351)). Four
findings over three documents, with nothing outstanding in carve-js or carve-rs.
The corpus grew 298 documents between that measurement and the 833-document one
above, which is the whole reason an undated "the gap is closed" sentence is worth
nothing here - a re-measurement is what says so, and only for the corpus it ran
over.

That one defect is the ONLY thing either ledger still declares, and it survived
a day in which the span ledger was re-measured six times and rewritten five. It
is the constant because nobody has started it, not because it is small - which
is a useful thing to know about a ledger: what stays in it is what nobody is
working on.

Every other position finding is `permitted` under §4.

That is also how the carve-rs row went wrong. It named the capped-container gap
for two days after the gap closed and the declaration behind it was deleted,
because the one-engine test above declared that row out of scope and handed it to
a script that never reads this page
([carve#965](https://github.com/markup-carve/carve/issues/965)). A row citing an
issue no ledger still declares is now a failing test rather than a sentence.

The §3a entries were measured, on `See [getting started][] here.` with the label
defined. All three engines now publish the whole triple - `href`, `ref` and
`rawRef` - which is what §3a asks for:

    carve-js   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-rs   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-php  {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}

The unresolved form agrees too: `See [missing][] here.` is a `link` node in all
three, not flattened text. Between them those two lines close what the rows used
to carry as open: whether the serialized tree is pre- or post-resolve (carve#481)
and carve-rs and carve-php flattening an unresolved reference (carve#486), both
answered and both closed.

WHICH label `ref` carries when the label holds inline markup is now RULED, and
the fleet already implements the ruling: given a collapsed reference whose label
is `` `code()` heading ``, all three engines publish the heading's rendered
text, `code() heading`. Measured on carve-js `79175a5`, carve-rs `d855367` and
carve-php `e2c3a97`, each built from a fresh clone of `main` on 2026-08-08.

`resources/ast-value-divergence.txt` declared that disagreement until the same
day, in the pre-merge terms this paragraph used to use. It was re-measured on
those three builds - a full `npm run ast:check` over 870 samples - and the
declaration is now EMPTY: no field the three publish differs anywhere in the
corpus, so both lines were deleted rather than reworded. The caption line that
sat beside it went the same way, fixed under
[carve#963](https://github.com/markup-carve/carve/issues/963).

It did not stay empty either. Re-measured on the morning of 2026-08-17 over 1124
documents plus 3 synthetic samples, at carve-js `02c4d80`, carve-rs `1ad93f0` and
carve-php `4610ef8`, two fields disagreed across four documents
(`paragraph.attrs.classes` and `paragraph.attrs.order`) and nine node types were
spanned differently across twenty-one. All eleven were declared in the two files
rather than left to fail the run, which is what those files are for.

Both halves moved again later the same day, and the two moved in opposite
directions - which is the case for re-measuring rather than reading the ledger.
At carve-js `80537c8`, carve-rs `71318e9` and carve-php `84c422b`, over the 1131
corpus documents plus 3 synthetic samples, `npm run ast:check` reports:

- **The value declaration is EMPTY again.** carve-php shipped the `326`/`329`
  container rulings, and both fields now agree everywhere. The run reported the
  two rows `FIXED` and stayed red until they were deleted.
- **The span declaration holds five rows across nine documents**, down from nine
  across twenty-one. `list`, `list_item`, `block_quote` and
  `definition_description` came `AGREED`; `text (presence)`,
  `code (presence)` and `definition_list (extent)` moved count.

The morning's block attributed eight span rows to a single carve-php issue. That
was too coarse, and the rows that survived their own issue's work are how it
shows: each surviving row was given its own tracker, in carve-php
([#1351](https://github.com/markup-carve/carve-php/issues/1351),
[#1361](https://github.com/markup-carve/carve-php/issues/1361),
[#1362](https://github.com/markup-carve/carve-php/issues/1362),
[#1363](https://github.com/markup-carve/carve-php/issues/1363)) and in carve-js
([#1145](https://github.com/markup-carve/carve-js/issues/1145),
[#1153](https://github.com/markup-carve/carve-js/issues/1153)). Two of those were
carve-js standing alone, so "one engine is behind" was never the whole shape
either.

Ninety minutes later it was four rows across eight documents, of 22,769 spans, at
carve-js `c8c8dc3`, carve-rs `71318e9` and carve-php `6bd856f`. Both carve-js
rows went in the two PRs that answered them - `code (extent)` came `AGREED` and
`text (presence)` dropped from six documents to three - and that second fix also
moved `resources/ast-position-waivers.txt`, which had not moved all day: a
continuation row's carried text now has its own span, so two permitted omissions
retire and a third halves.

Which is the point of dating these paragraphs rather than writing them in the
present tense. The block above says a row "will not clear when carve-php catches
up" and names it the one worth watching; it cleared within two hours, in the
other engine, for an unrelated reason. Every remaining span row is carve-php
alone - the first time that day the panel had one engine on every row, and the
third consecutive block to claim something like it.

One more measurement that day, at carve-php `30cc587`, is the one worth keeping
for what it says about the ledgers rather than about the engines. The span
declaration read four rows across eight documents again, with all four counts
identical to the measurement before it - and `code (presence)` had swapped both
its three documents and which engine stood alone. carve-php stopped publishing a
position for a node assembled from discontiguous source, which is right for a
verbatim run carried across a `+` row and wrong for a fenced code block, whose
position is an extent over one contiguous region
([carve-php#1369](https://github.com/markup-carve/carve-php/issues/1369)).

A row that changes its documents and its direction while holding its count is
invisible to a count-based declaration - and the run still failed, because the
six carve-php position findings arrived undeclared in
`resources/ast-position-waivers.txt`. The two ledgers cover each other's blind
spot, which is worth knowing before anyone proposes folding them into one.

It happened a second time within the hour, which is what makes it a pattern
rather than an anecdote. At carve-php `1f60342` the span declaration is three
rows across seven documents: `paragraph (extent)` came `AGREED` and
`definition_list (extent)` dropped from two documents to one - but the surviving
document is not either of the two the closed issue named. Both `329` fixtures
agree now; what is left is `266-a-reference-definition-is-anchored-at-end-of-line-12`,
where the list's extent runs one line PAST a reference definition it does not
consume, the mirror of the gap that was fixed
([carve-php#1371](https://github.com/markup-carve/carve-php/issues/1371)).

So twice in an hour a fix landed correctly on the documents its issue named and
over-reached onto one it did not. The count moved just enough to read as
progress. A row here is a NODE TYPE, and the documents behind a type turn over
faster than the row does - which is why the ledger records document names in
prose beside each count, and why "the number went down" is not an answer to
"did that gap close".

Both over-reaches were then fixed, and the day's last measurement - taken from a
clone made for it, at carve-js `c8c8dc3`, carve-rs `d981df8` and carve-php
`d2e2fd6` - reads ONE span row across three documents, of 22,766 spans:
carve-php dropping the position of a line block's spaced content
([carve-php#1351](https://github.com/markup-carve/carve-php/issues/1351)). The
same three documents are the owed half of
`resources/ast-position-waivers.txt`, so for the first time that day the two
ledgers describe one gap rather than covering for each other. The value
declaration is empty and carve-rb's tree matches carve-rs on all 1134 shared
documents.

Six measurements in one day, each taken because the one before it had stopped
being true. That is the number worth carrying forward from this section: not
which rows are declared, but how quickly a declared row stops describing
anything, and therefore that the run - not the ledger, and not a merged pull
request - is what answers a question about the engines.

The seventh, on 2026-08-18 at carve-js `020c73e8`, carve-rs `a33c42ad` and
carve-php `f30ebd1` over 1259 corpus documents, made that point again and
changed the kind of row it makes it with. `text (presence)` came `AGREED` and
carve-php's owed position findings emptied; what replaced it is
`hard_break (extent)` on one document, where all three engines publish the same
two offsets and disagree about the line and column the end offset names
([carve-php#1457](https://github.com/markup-carve/carve-php/issues/1457)). The
clause deciding it is not the markup-inclusive rule the other rows turn on but
the sentence beside it: a break owns its line terminator and ends at column 1 of
the following line. Three `permitted` position waivers went in the same run, two
of them lines that had described a node carve-js and carve-rs were placing all
along.

An empty declaration is a statement about the corpus, which is the only thing
the run measures. Four collapsed-reference labels the corpus does not hold - one
carrying `/emphasis/`, one an escape, one a nested link, one a symbol shortcode
- do still split carve-php from the other two, and they split the HTML with it,
so they are owed a fixture rather than a declaration
([carve#1011](https://github.com/markup-carve/carve/issues/1011)).

**This paragraph said the opposite until 2026-08-08**, recording carve-php as
publishing the rendered text where the other two published the authored label.
That was true when written and stopped being true within hours: carve-js#875 and
carve-rs#799 moved js and rs onto the rendered text the same afternoon. A screen
written from the stale text then reasoned carve-php was the defective engine and
filed against it, which would have made it the sole outlier and undone two
merges.

So it was a design question rather than a divergence, and it is ruled at
[carve#962](https://github.com/markup-carve/carve/issues/962): `ref` carries the
RESOLUTION KEY, and §3a above now says so instead of leaving "the derived label"
to be read both ways. What decided it is that the authored label is recoverable
from `rawRef` by stripping its brackets while the key is recoverable from
nothing - `href` holds the SLUG (`#code-heading`), which is a different string
from the key (`code() heading`).

An earlier version of this paragraph recorded something different again - none
publishing `rawRef`, carve-php publishing `ref: ""` - and the rows above
described the same. The engines moved and the page did not, which is the failure
mode this table exists to prevent.

That has now happened to this section **twice**, the second time eleven lines
below this warning. So the warning is worth stating as a rule rather than an
observation: **a measured claim on this page needs re-measuring before it is
cited, and citing it without re-measuring has produced a wrong ticket.** Every
claim above now carries the engine SHA it was measured against, so a reader can
see how old it is.

The §7 clause the rows used to carry - carve-js and carve-rs leaving an
`abbreviation_def` inside its container instead of hoisting it - is gone, and
not because either engine moved. The spec answered carve-php#631 with a third
option neither engine had implemented: inside a block quote, a list item or a
div, `*[TERM]: expansion` is NOT A DEFINITION AT ALL. It is ordinary paragraph
text, it defines nothing, and there is no `abbreviation_def` to hoist or leave.

Measured on the issue's own document, a definition inside a div, and on the
block-quote and list-item forms beside it: no engine emits an
`abbreviation_def` in any of the three, and all three render the line as the
literal text the author typed with no `<abbr>` below it. So a row describing
where the node sits describes a node that is not produced.

This is the third way a measured table goes wrong, after "the engine fixed it"
and "the engine regressed": the QUESTION was withdrawn. Both readings the issue
weighed - definitions stay put, definitions hoist - stopped being the choice
once the construct stopped existing in that position.

That is also why the §3a row is worth keeping while the others go. The spec
says what the shape is, then the engines conform, then the pin moves; a row is
the honest record of where an engine is in that order, and it has to be deleted
when the order finishes rather than left behind as a fact.

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

A run of terms belongs to the descriptions that follow it - the rule the
rendered list already shows. The grouping is **not** published, for three
reasons:

- a plain `{terms, definitions}` object can carry no `pos`, which left a term
  the only content in a serialized document an editor could not navigate to -
  the same argument §7 used to move frontmatter and footnote definitions out of
  root fields;
- `definition_term` and `definition_description` are in the [normative block
  vocabulary](/profiles), so a profile can name them. Under the object form
  those two entries named nothing and a profile denying either was a silent
  no-op;
- the grouping was **not a shared fact**. Given the same four lines, carve-js
  published one entry with two terms and two definitions while carve-rs
  published three entries split differently - and all three engines rendered
  the same `<dl>`. A structure two producers disagree about, which no output
  depends on, is an internal.

### A spelled looseness is a field

A `definition_list` may carry `loose: true`. It means what
[`{loose}`](/blocks-and-attributes)
means in source: every description renders its children as **blocks**. Absent,
each description derives its own wrapper from its own block count - one block
renders inline, two or more render as blocks - which is what every definition
list written without the key does.

```json
{"type": "definition_list", "loose": true, "items": [
  {"type": "definition_term", "children": [ ... ]},
  {"type": "definition_description", "children": [ ... ]}
]}
```

Only the **spelled** fact is published, for the same reason the grouping is not:
everything else is derivable. What is not derivable is the one shape the key
exists for - a blank line between two entries does not loosen a `<dl>` at all,
so `<dd><p>x</p></dd>` has no blank-line spelling at any entry count, and a tree
without this field cannot say which of the two spellings it came from.

That makes a definition list unlike a `list`, where `tight` is required and
states the whole axis. The name differs for the same reason: a `tight` field
would be absent on almost every definition list, and an absent boolean read as
false says *loose* - the opposite of the default, in the one place a consumer is
most likely to write `if (node.tight)`.

::: info Engine support
No engine has shipped `{loose}` yet, so none emits this field. The corpus
documents that spell it are declared in `resources/engine-pin-drift.txt` until a
pin catches up.
:::

## Composite figures

A bare `::: figure` container (PART 9 section 4c) serializes as its own node type,
`figure_group` (§16):

```json
{"type": "figure_group",
 "children": [ ... ],
 "caption": [ ... ],
 "attrs": { ... },
 "pos": { ... }}
```

`children` are ordinary block nodes in source order; the panels are the
`figure` and `table` nodes among them, and non-panel stray content sits
between them in place. There is **no** `panels` array - repeating the children
under a second key would let the two disagree, so a consumer derives the panel
list the way the renderer does: by type, in order. `caption` is the group
caption (the `^ ` line after the closing fence); absent means uncaptioned, not
an empty array.

The node is discriminated by its `type`, deliberately: every `figure` carries
a `target`, the group does not, and a consumer probing for the missing field
instead of reading the type string would break silently the day either shape
grows a field. No `title`, no `label`, no `shortCaption`, no legend fields -
that design space belongs to carve#1118 and carve#1121 and is not claimed
here.

## Bibliography definitions

A `[@key]: entry` line is its own node (§18), not a paragraph and not consumed
state:

```json
{"type": "citation_definition",
 "key": "smith2020",
 "attrs": {"keyValues": {"author": "Smith", "year": "2020"}},
 "children": [ ... ],
 "pos": { ... }}
```

`key` is the citation key without the `@`, the same string `citation.key`
carries at the use site. `children` is the entry's INLINE content - what
follows the `]: ` separator and the optional metadata block - which is why the
node is shaped after §10's `link_reference_definition` rather than after the
footnote definition: a footnote body holds blocks, an entry holds one line of
rendered text. `attrs` is the leading `{author= year=}` block, feeding
author-date mode. `children` is required as a FIELD but may be an empty array -
which source lines carry no entry is a separate question §18 does not settle,
and the two answers on record disagree: the production requires a space after
`]:` while the reference build accepts a line without one.

It is Tier-2, so it appears only where the Citations extension is enabled. With
the extension off the line is ordinary paragraph text - it is not a link
reference definition either, since a leading `@` is reserved against that in
core.

**No rendered output moves.** The node renders nothing where it sits and the
entry's text renders in the references list, exactly as before, which is why the
divergence this closes survived so long: carve-php consumed the line at parse
time and carve-js left it as a paragraph whose first child is a `citation_group`
followed by the literal text `: {author=`, and both produced byte-identical
HTML. Anything reading the tree saw two different documents - a ProseMirror
bridge on one engine received three paragraphs of citation-shaped prose and
round-tripped them as prose ([carve#1276](https://github.com/markup-carve/carve/issues/1276)).

**No engine emits it yet**, at the time of writing; the clause landed first and
the engines follow. `tests/citation-definition-is-a-node.test.mjs` pins the wire
shape against the schema and carries a tripwire that fails on the pinned build
the day it does, so this paragraph cannot go stale the way the rows above have
twice.

## Open question

**Citation items are plain objects**, carrying `key`, `prefix`, `locator` and
`suffix` with no `type` and no `pos`. The definition-list argument applies only
partly: a citation item is not in the profile vocabulary, so nothing names it
and no denial is silently lost - but a locator is still content a consumer might
want to navigate to.

It is the last place where content in the tree is not a node.
