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
`field-unspellable` for `code_block.value` through a conversion-diagnostics
API. A `caption.short` survives interchange but is omitted from Carve 0.1 source;
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

Every bare tree has `type: "document"`, block `children`, and
`astVersion: "2.0"`. `srcByteLength` is present only when source bytes were
measured. Zero means an empty source; absence means unmeasured. The root can
also declare `extensions`, resolution `stages`, `resources`, and common node
fields. Other core fields are refused
([CARVE-P12-024](./rules/ast-interchange),
[CARVE-P12-031](./rules/ast-interchange)).

```json
{
  "type": "document",
  "astVersion": "2.0",
  "children": [
    { "type": "paragraph", "children": [{ "type": "text", "value": "Hello" }] }
  ],
  "srcByteLength": 5
}
```

At a storage or process boundary, this tree is required inside an envelope.
An in-memory handoff and `carve --json` use the bare tree. The envelope’s
`astVersion` describes the same contract, and its extension declarations use
`name` and an explicit `required` boolean:

```json
{
  "astVersion": "2.0",
  "extensions": [
    { "name": "org.example.notes", "version": "1", "required": false }
  ],
  "document": { "type": "document", "astVersion": "2.0", "children": [] }
}
```

### Forward compatibility

A reader refuses a higher major, an unknown required extension, an unknown
core field, or an extension node with an invalid fallback. A higher minor can
add only optional declared extensions, extension nodes with fallback, and
namespaced `data`. It cannot add core fields or core node types
([CARVE-P12-056](./rules/ast-interchange)).

## Node fields and traversal

Primary content is in `children`. Literal payload is in `value`. Named
secondary slots carry content with a different role: `caption`, `short`,
`prefix`, `locator`, `suffix`, `old`, `new`, ruby `pairs`, extension `fallback`,
and named extension `slots`. The
[node roles table](https://markup-carve.github.io/carve/node-roles.json)
is generated from the schema and identifies every node-bearing slot
([CARVE-P12-071](./rules/ast-interchange)).
Its `metadata-tree` role visits block nodes nested in `metadata` or extension
`props`. Opaque `data` and extension `payload` are not traversed as AST nodes.

Every typed node may carry `attrs`, namespaced `data`, `pos`, discontinuous
`segments`, `metadata`, `dir`, and `lang` where its schema permits them.
Unknown core fields are refused. The `data` keys are qualified names declared
as extensions. A reader preserves unknown optional data without interpreting
it ([CARVE-P12-030](./rules/ast-interchange)).

`pos.startOffset` and `pos.endOffset` count UTF-8 bytes. Lines and columns are
one-based; columns count Unicode codepoints. Imported nodes without a source
position omit `pos`. `segments` records multiple source spans when a node was
reassembled from discontinuous regions. Session node identity and overlapping
annotations remain separate sidecars
([CARVE-P12-060](./rules/ast-interchange),
[CARVE-P12-062](./rules/ast-interchange)).

Which nodes have no `pos` at all, and why, is set out with the span rules below.

## References and authored spelling

Reference uses and definitions use `key` and `namespace`. The namespaces
distinguish links, footnotes, citations, abbreviations, and headings. A direct
link or image with no reference key has neither field. `rawRef` retains source
spelling. Resolution adds `href`, `src`, expansion, or a number beside the
authored key. On a reference use, absent `href` or `src` means unresolved;
`""` means an explicit or resolved empty destination. `resolved` is no longer
a field. A link may use `targetKind` to distinguish a URL, wiki page, document,
or cross reference ([CARVE-P12-005](./rules/ast-interchange),
[CARVE-P12-006](./rules/ast-interchange),
[CARVE-P12-047](./rules/ast-interchange)).

```json
{ "type": "link", "key": "start", "namespace": "link", "rawRef": "[Start][]" }
```

**`ref` is the resolution key** in a 1.2 tree. In 2.0 the same key is called
`key`. For a collapsed label with markup, the old JSON example was
`"ref": "code() heading"`; 2.0 uses `"key": "code() heading"`.

The general `xref` node replaces `heading_ref`. It carries `key`, `namespace`,
optional resolved `href`, and `form`: number, page, title, or full. The first
node with a given `attrs.id` in document order wins; each later duplicate
gets a diagnostic ([CARVE-P12-010](./rules/ast-interchange)).

The destination is the author's text, before rendering. A consumer that renders a destination owns the denylist: a serialized link can carry
`javascript:alert(1)`, and a URL sink must refuse it. Serialization must not sanitize or resolve it a
second time ([CARVE-P12-008](./rules/ast-interchange),
[CARVE-P12-009](./rules/ast-interchange)).

## Lists and tasks

A `list` carries `children` of list items, a discriminated `marker`, and
`spacing` (`tight` or `loose`). A bullet marker contains `kind: "bullet"`
and `char`; an ordered marker contains `kind: "ordered"` and may contain
`style`, `delimiter`, `start`, or `bare`. Fields from the two forms cannot be
mixed. A definition list also uses `children` and `spacing`.

```json
{
  "type": "list",
  "marker": { "kind": "ordered", "style": "1", "delimiter": ".", "start": 2 },
  "spacing": "tight",
  "children": [{ "type": "list_item", "children": [] }]
}
```

A task item has `task.mark` and `task.status`. Space is todo, `x` done,
`-` cancelled, `_` and `>` partial, and `?` other. The pair must agree.
The 1.2 `checked` and `taskState` fields are removed
([CARVE-P12-070](./rules/ast-interchange)).

## Tables, cells, figures, and captions

A table holds `table_head`, `table_body`, and `table_foot` in `children`.
Each group holds rows; each row holds cells. There is no flat `rows` list
or `rowGroups` count object. A table without explicit source grouping has a
head from its leading all-header rows and a body for the remainder. Every
table carries a `columns` array through its widest row, empty for an empty
table. Its records are typed `table_column` nodes: `align` keeps authored alignment,
while `resolvedAlign` records header precedence
([CARVE-P12-034](./rules/ast-interchange),
[CARVE-P12-039](./rules/imports-security-extensions)).

Every `table_cell.children` is a block list. Inline source content is one
`cell_paragraph` with inline `children`; only that wrapper may contain
`cell_wrap`. Imported block content can use ordinary blocks. A tight cell
renders its single `cell_paragraph` without a paragraph wrapper. Spans and
resolved `colspan` and `rowspan` remain on the cell
([CARVE-P12-049](./rules/ast-interchange)).

A `figure` holds block `children` and an optional `kind`. A `caption` node
holds block `children` and optional inline `short`. A table within a figure
keeps its own caption; the outer caption describes the figure. A writer
reports a loss when Carve source cannot express block caption content,
mixed figure children, or a short navigation caption
([CARVE-P12-033](./rules/ast-interchange),
[CARVE-P12-036](./rules/imports-security-extensions)).

## Extensions and foreign data

`block_extension` and `inline_extension` use the same fields: a qualified
`name`, optional `version`, typed `props`, walked `children`, named `slots`,
a required typed `fallback`, and a `payload` list of alternatives. An unknown
optional extension renders through its fallback and reports the loss. An
unknown required extension is refused. Extension payloads do not execute
when read ([CARVE-P12-055](./rules/ast-interchange)).

Foreign constructs with a core equivalent map to core nodes. A construct
without one may use declared `data` or an extension. If a writer cannot
preserve it, it reports the loss and its JSON path. Styles, headers, footers,
and section properties use declared extensions until a major version gives
them core fields. The contract promises semantic interchange and preservation
of Carve source facts; it does not promise editable round trips for every
foreign format ([CARVE-P12-073](./rules/ast-interchange)).

`document.resources` is a media-bag manifest. Each entry has a stable id,
media type, and SHA-256 digest. `image.resourceId` and extension resource ids
refer to those entries. A location hint alone is not resource identity.
Readers bound payload size, metadata depth, resource references, and fallback
recursion as PART 12 specifies.


## Equality, validation, and sidecars

Canonical AST equality includes source facts, attributes, metadata, and
opaque `data` after normalization. Text nodes coalesce before serialization.
Positions, session ids, range anchors, and resolution results have separate
checks ([`CARVE-P12-002`](./rules/ast-interchange),
[`CARVE-P12-072`](./rules/ast-interchange)).

Validate the tree against the published schema. A malformed node, a 1.2
field on a 2.0 node, a `cell_wrap` outside a cell, and an undeclared required
extension must be refused. Node identity, annotation ranges, source layout,
and provenance are opt-in sidecars, each with its own schema. They travel
beside the tree, never inside it ([`CARVE-P12-067`](./rules/ast-interchange)).

### Source positions and hoisted definitions

**Positions are required** (PART 12 §4) for placed nodes except the root:

```json
"pos": { "startLine": 1, "endLine": 1, "startColumn": 2, "endColumn": 5, "startOffset": 1, "endOffset": 4 }
```

Lines and columns are 1-based; offsets are 0-based UTF-8 bytes. Ends are exclusive, and columns count Unicode codepoints.
Both use exclusive ends, and the offset must land on a UTF-8 boundary.

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
  "children": [ { "type": "image", "src": "/u", "alt": "a", "key": "r", "namespace": "link", "rawRef": "[r]" } ] }
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
`scripts/ast-conformance.mjs` checks it. See [`CARVE-P12-002`](./rules/ast-interchange) and
[`CARVE-P12-003`](./rules/ast-interchange).

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

The schema describes an ordered `list.marker.start` as absent when it equals 1.
When an ingested ordered marker carries `start: 1`, the encoder drops it, so every published tree
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
  worst per-level cost of its 2.0 encoding ([`CARVE-P12-028`](./rules/ast-interchange));
- a property the schema does not name, at any node, named with its path. It
  does not drop or echo it ([`CARVE-P12-030`](./rules/ast-interchange));
- a root missing `type`, `children` or `astVersion`, carrying an unnamed core property,
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
requires `key`, and an `id` there is refused like any other unnamed property
([`CARVE-P12-047`](./rules/ast-interchange)). A `citation` exists only as an item of a `citation_group`
([`CARVE-P12-059`](./rules/ast-interchange)).

## Tables: spans, cells and groups

A cell that the span walk extended carries `colspan` and `rowspan` beside the
markers that produced them; absent means 1 ([`CARVE-P12-048`](./rules/ast-interchange)). A tree from HTML
or Pandoc carries counts and no markers, and a reader derives the covered
positions from the counts. Where markers and counts disagree, the markers win
([`CARVE-P12-061`](./rules/ast-interchange)). Every cell has block `children`.
A source pipe cell uses one `cell_paragraph` with inline children; an imported
cell may hold other blocks. Markdown, plain and ANSI flatten those blocks onto
one line and report lost boundaries ([`CARVE-P12-049`](./rules/ast-interchange)).

Rows belong to `table_head`, `table_body`, or `table_foot` nodes in table
`children`. A body may carry `headRows` and `rowHeadColumns`; each group keeps
its own attributes. Source `header-rows`, `footer-rows`, `body-rows`,
`body-header-rows`, and `body-header-cols` still express the partition. Invalid
source metadata stays ordinary attributes, and a canonical writer reports
conflicting authored values instead of changing them or reordering rows
([`CARVE-P12-034`](./rules/ast-interchange)).

## Extensions and the envelope

`block_extension` and `inline_extension` carry a qualified `name`, optional
`version`, typed `props`, walked `children`, named `slots`, a required typed
`fallback`, and `payload` alternatives. An unknown optional name renders through
the fallback and reports the loss ([`CARVE-P12-055`](./rules/ast-interchange)).

At a storage or process boundary, wrap the tree in an envelope:

```json
{
  "astVersion": "2.0",
  "extensions": [{ "name": "org.example.citations", "version": "1", "required": false }],
  "document": { "type": "document", "astVersion": "2.0", "children": [] }
}
```

The tree inside keeps its version. A reader refuses a higher major or an
unknown required extension. A higher minor may add optional declared
extensions and namespaced `data`, but no core property or core node type
([`CARVE-P12-056`](./rules/ast-interchange)).

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

Which fields hold other nodes depends on the type carrying them. `children`
is a node list on containers, while `value` is a string on `code_block`.
[`node-roles.json`](https://markup-carve.github.io/carve/node-roles.json) is
generated from the schema and names primary and secondary node slots:

```json
{ "table": { "children": { "role": "node-sequence", "admits": ["table_head", "table_body", "table_foot"] },
             "columns": { "role": "node-sequence", "admits": ["table_column"] } } }
```

A `node-sequence` is an array of nodes and a `single-node` is one node.
The `metadata-tree` role visits nodes in `metadata` or extension `props`;
opaque `data` and extension `payload` are not traversed as AST nodes
([`CARVE-P12-071`](./rules/ast-interchange)).

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

A definition list's `children` hold the `<dt>` / `<dd>` sequence as nodes in
document order:

```json
{"type": "definition_list", "children": [
  {"type": "definition_term", "children": []},
  {"type": "definition_term", "children": []},
  {"type": "definition_description", "children": []}
], "spacing": "loose"}
```

A run of terms belongs to the descriptions that follow it, so grouping is
derivable and is not published. `spacing` is `tight` or `loose`, as on an
ordinary list. See [`CARVE-P12-027`](./rules/ast-interchange).

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

`code_block.value` is literal payload text. A closed fence containing `a`
publishes `"a\n"`; an imported code element containing `a` without a final
break publishes `"a"`, and readers keep the two apart. A canonical Carve fence
needs a break before its closer, so writing `"a"` adds one and reports
`field-unspellable` for `code_block.value`. `raw_block.value` follows the same
rule. Trees stored under the earlier encoding, which omitted the last line's
break, cannot be told apart from new ones by their strings; migrate them from
source. See [`CARVE-P12-064`](./rules/ast-interchange) and
[`CARVE-P12-065`](./rules/ast-interchange).

`resources/ast-code-content-fixtures.json` and
`resources/ast-code-payload-samples.json` pin the parsed values the engines are
checked against.

## Interchange fallback matrix

Generated from [the checked summary table](https://github.com/markup-carve/carve/blob/main/resources/spec/23-ast-foundations.ebnf). The cited clauses prevail if the summary disagrees. These wrapper/field forms have no Carve 0.1 core source spelling. Brackets restrict a row's scope. Detailed algorithms, attribute exceptions, diagnostic targets, API conditions and reporting strength remain in the cited PART 12 clauses. The diagnostic column names known codes with the targets named by the clauses; `clause` leaves the code/channel to the cited clauses, including cross-clause channel assignments. Unlisted diagnostic targets and `unspecified` action cells add no ruling.

| Shape | Rule | Carve | HTML | Markdown | Plain | ANSI | Diagnostic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `caption.short` | [`CARVE-P12-033`](https://github.com/markup-carve/carve/blob/main/resources/spec/24-ast-contract.ebnf#L331) | `omit_field` | `ignore_field` | `unspecified` | `ignore_field` | `ignore_field` | `clause` |
| `figure.children[table]` | [`CARVE-P12-036`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L2) | `table_caption` | `figure` | `unspecified` | `unspecified` | `unspecified` | `clause` |
| `table_cell.children` | [`CARVE-P12-049`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L267) | `unspecified` | `cell_blocks` | `flatten_blocks` | `flatten_blocks` | `flatten_blocks` | `field-unspellable (Carve,Markdown,Plain,ANSI)` |
| `small_caps` | [`CARVE-P12-050`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L296) | `unwrap` | `smallcaps_span` | `smallcaps_span` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `section` | [`CARVE-P12-052`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L2) | `unwrap` | `section` | `unwrap` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `ruby` | [`CARVE-P12-054`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L61) | `parenthesized_pairs` | `ruby` | `ruby` | `parenthesized_pairs` | `parenthesized_pairs` | `ruby-flattened (Carve,Plain,ANSI)` |
| `block_extension[unknown name]` | [`CARVE-P12-055`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L98) | `fallback` | `fallback` | `fallback` | `fallback` | `fallback` | `clause` |

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

<!-- BEGIN GENERATED AST FALLBACK MATRIX -->
## Interchange fallback matrix

Generated from [the checked summary table](https://github.com/markup-carve/carve/blob/main/resources/spec/23-ast-foundations.ebnf). The cited clauses prevail if the summary disagrees. These wrapper/field forms have no Carve 0.1 core source spelling. Brackets restrict a row's scope. Detailed algorithms, attribute exceptions, diagnostic targets, API conditions and reporting strength remain in the cited PART 12 clauses. The diagnostic column names known codes with the targets named by the clauses; `clause` leaves the code/channel to the cited clauses, including cross-clause channel assignments. Unlisted diagnostic targets and `unspecified` action cells add no ruling.

| Shape | Rule | Carve | HTML | Markdown | Plain | ANSI | Diagnostic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `caption.short` | [`CARVE-P12-033`](https://github.com/markup-carve/carve/blob/main/resources/spec/24-ast-contract.ebnf#L339) | `omit_field` | `ignore_field` | `unspecified` | `ignore_field` | `ignore_field` | `clause` |
| `figure.children[table]` | [`CARVE-P12-036`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L2) | `table_caption` | `figure` | `unspecified` | `unspecified` | `unspecified` | `clause` |
| `table_cell.children` | [`CARVE-P12-049`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L309) | `unspecified` | `cell_blocks` | `flatten_blocks` | `flatten_blocks` | `flatten_blocks` | `field-unspellable (Carve,Markdown,Plain,ANSI)` |
| `small_caps` | [`CARVE-P12-050`](https://github.com/markup-carve/carve/blob/main/resources/spec/25-ast-extensions.ebnf#L348) | `unwrap` | `smallcaps_span` | `smallcaps_span` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `section` | [`CARVE-P12-052`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L2) | `unwrap` | `section` | `unwrap` | `unwrap` | `unwrap` | `structure-unspellable (Carve)` |
| `ruby` | [`CARVE-P12-054`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L61) | `parenthesized_pairs` | `ruby` | `ruby` | `parenthesized_pairs` | `parenthesized_pairs` | `ruby-flattened (Carve,Plain,ANSI)` |
| `block_extension[unknown name]` | [`CARVE-P12-055`](https://github.com/markup-carve/carve/blob/main/resources/spec/26-ast-interchange.ebnf#L98) | `fallback` | `fallback` | `fallback` | `fallback` | `fallback` | `clause` |

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
