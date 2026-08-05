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

**The root carries exactly three fields** - `type`, `children`, `srcByteLength`
(PART 12 §7). Frontmatter and definitions are **block nodes in the tree**, not
root fields, because a root field cannot carry a position and both are source an
editor navigates to. A definition is a child of the **document** even when it was
authored inside a container - footnote and abbreviation alike - because its scope
is the document wherever it was written. Its `pos` still says where that was.

**Field names are spec surface** (§3). `href`, `src`, `value`, `level`,
`children`. An implementation whose internals differ maps on the way out; it does
not export its internals, and it does not invent a synonym.

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

It has to work this way, because the destination has nowhere else to live. There
is **no node type for a `[label]: url` link reference definition** - a document
holding only `[lbl]: /u` publishes zero children. An empty `href` on a resolved
reference would discard `/start` outright, and a consumer decoding that tree
would render a link to nothing with no second stage available to it.

For the collapsed form `[getting started][]`, `ref` is the **derived** label
(`getting started`) - the label the reference resolves by. `rawRef` holds the
authored spelling, so the empty brackets are not lost.

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

An implementation that cannot place a node **omits `pos` rather than inventing
one**, and says so. Absent is a fact a consumer can act on; a wrong span is not.

A **reassembled** node - one the producer joined from pieces the source
separates, or synthesized outright - **may omit `pos` and is conformant doing
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

## What is not in it

Formatter-internal nodes (PART 11, and the `raw_text` case the profiles
vocabulary excludes) are not part of the document and are not serialized. Under
§3a nothing on the document side needs `raw_text` either: an unresolved
reference stays a `link` rather than reverting to literal source, so no node has
to carry text that must not be escaped again.

Resolution results a consumer could recompute - footnote numbering, caption
numbers - **are** serialized, because recomputing them means reimplementing the
resolution rules. Those are **added alongside** the authored construct, not
substituted for it: a resolved footnote reference keeps its label and gains its
number, and a resolved reference link keeps its `ref` and `rawRef` and gains its
`href`.

## Conformance status

Run `node scripts/ast-conformance.mjs` in this repo against sibling checkouts of
the engines. It reports two things a schema cannot: nodes with no position, and
spans that do not cover the text they claim.

| engine | shape | positions |
|---|---|---|
| carve-js | §3a conformant on the resolved form: publishes `href`, `ref` and `rawRef` together | blocks and inlines, except reassembled regions (table cells, line-block content) |
| carve-rs | §3a conformant on the resolved form: `ref` and `rawRef` survive resolution beside `href` (the open half of [carve#481](https://github.com/markup-carve/carve/issues/481), now measured) | blocks and most inlines; reconstructed regions are unplaced, as are the paragraphs a capped container degrades to ([carve#672](https://github.com/markup-carve/carve/issues/672)) |
| carve-php | §3a conformant on both forms measured here: an unresolved reference is a `link` node (closing the shape [carve#486](https://github.com/markup-carve/carve/issues/486) reported), and the collapsed form carries the derived label in `ref` beside `rawRef`; two field-name divergences left: the root carries `abbreviations`, and `inline_extension` publishes `extensionType`/`children` ([carve-php#510](https://github.com/markup-carve/carve-php/issues/510)) | recorded behind a parse option, enabled whenever it serializes |
| carve-rb / carve-py / carve-go / carve-wasm | publish carve-rs's bytes | whatever carve-rs records |

The gaps are listed rather than smoothed over on purpose: "six implementations"
is only a claim worth making if the disagreements are visible.

The **reassembled** regions in the positions column are not among them - §4 names
that category permitted, so a table cell or line-block region without a position
is conformant rather than owed. What is still a gap is anything else in that
column, and the test is whether a true span EXISTS rather than whether one was
written down.

The definition-list entry this paragraph used to name is fixed: carve-rs places
`definition_term` and `definition_description` today, checked over every
corpus document that contains one. What the same measurement does turn up is a
different gap - carve-rs and carve-php leave the paragraphs a CAPPED container
degrades to unplaced (`182-openers-past-the-nesting-cap-are-one-paragraph`),
where carve-js places them against real offsets, so the reassembly exemption does
not reach them ([carve#672](https://github.com/markup-carve/carve/issues/672)).

The §3a entries were measured, on `See [getting started][] here.` with the label
defined. All three engines now publish the whole triple - `href`, `ref` and
`rawRef` - which is what §3a asks for:

    carve-js   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-rs   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-php  {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}

The unresolved form agrees too: `See [missing][] here.` is a `link` node in all
three, not flattened text.

An earlier version of this paragraph recorded the opposite - none publishing
`rawRef`, carve-php publishing `ref: ""` - and the rows above described the
same. The engines moved and the page did not, which is the failure mode this
table exists to prevent, so it is worth saying that a measured claim needs
re-measuring rather than citing.

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

## Open question

**Citation items are plain objects**, carrying `key`, `prefix`, `locator` and
`suffix` with no `type` and no `pos`. The definition-list argument applies only
partly: a citation item is not in the profile vocabulary, so nothing names it
and no denial is silently lost - but a locator is still content a consumer might
want to navigate to.

It is the last place where content in the tree is not a node.
