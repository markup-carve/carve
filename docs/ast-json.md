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

Four rules carry most of the weight:

**The root carries exactly three fields** - `type`, `children`, `srcByteLength`
(PART 12 §7). Frontmatter and footnote definitions are **block nodes in the
tree**, not root fields, because a root field cannot carry a position and both
are source an editor navigates to.

**Field names are spec surface** (§3). `href`, `src`, `value`, `level`,
`children`. An implementation whose internals differ maps on the way out; it does
not export its internals, and it does not invent a synonym.

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

## What is not in it

Formatter-internal nodes (PART 11, and the `raw_text` case the profiles
vocabulary excludes) are not part of the document and are not serialized.

Resolution results a consumer could recompute - footnote numbering, caption
numbers - **are** serialized, because recomputing them means reimplementing the
resolution rules.

## Conformance status

Run `node scripts/ast-conformance.mjs` in this repo against sibling checkouts of
the engines. It reports two things a schema cannot: nodes with no position, and
spans that do not cover the text they claim.

| engine | shape | positions |
|---|---|---|
| carve-js | conformant over the corpus | blocks and inlines, except reassembled regions (table cells, line-block content) and the synthesized `frontmatter` / `footnote` wire nodes |
| carve-php | field-name divergences remain - `attrs` published as a flat map, `figure` carrying `children` instead of `target` + `caption`, `mention` exposing its rendering internals ([carve-php#510](https://github.com/markup-carve/carve-php/issues/510)) | recorded behind a parse option, enabled whenever it serializes |
| carve-rs | conformant | blocks only; the inline half is in progress ([carve-rs#352](https://github.com/markup-carve/carve-rs/issues/352)) |
| carve-rb | publishes carve-rs's tree through a serializer forked into the binding; `emphasis` carries a `kind` the type already encodes, and `fromCrossref` is spelled `from_crossref` ([carve-rb#26](https://github.com/markup-carve/carve-rb/issues/26)) | whatever carve-rs records |

The gaps are listed rather than smoothed over on purpose: "six implementations"
is only a claim worth making if the disagreements are visible.

## Open questions

Two shapes are not settled, and the schema records the reference form rather than
pretending otherwise:

**Definition-list entries are plain objects**, carrying `terms` and
`definitions`, with no `type` and no `pos` - so a consumer cannot navigate to a
term. The profile vocabulary does list `definition_term` and
`definition_description`, and carve-php emits them as nodes.

**Citation items are plain objects** for the same reason.

Both are the last places where content in the tree is not a node.
