---
description: The contract for converting HTML into Carve - a migration boundary, deliberately not a general HTML serializer.
---

# HTML import contract

HTML import is a migration boundary, not an HTML serializer. Implementations
parse HTML with an HTML5 parser, map supported semantics to the Carve AST, and
use the normal Carve writer for source output.

## Pipeline

```
HTML bytes -> HTML5 DOM -> import policy -> Carve AST -> canonical writer
```

Imported nodes do not carry Carve source positions. An implementation may
report HTML locations separately, but must not put HTML offsets in `pos`.

The writer at the end of that pipeline is what makes a shared fixture
comparable at all, so it is also the rule for anything an importer spells: an
importer emits the source `carve fmt` emits, down to whether an attribute value
carries quotes and which slot it sits in. An importer that builds its source
by hand rather than through the writer has to hold that line itself.

## Semantic elements

Seven inline elements import as the compact semantic span, which is the exact
round trip of what the HTML said and stays one node.

| HTML | Carve | value source |
| --- | --- | --- |
| `<kbd>` | `[c]{kbd}` | none, the bare boolean |
| `<abbr title="X">` | `[c]{abbr="X"}` | `title` |
| `<time datetime="X">` | `[c]{time="X"}` | `datetime` |
| `<samp>`, `<var>`, `<cite>` | `[c]{samp}` etc. | none, the bare boolean |
| `<dfn title="X">` | `[c]{dfn="X"}` | `title` |

The attribute a value came from is consumed rather than repeated beside the
name, and a name whose value attribute is absent or empty gives the bare
boolean (`<abbr>` and `<abbr title="">` both give `[c]{abbr}`). A leftover
`id`, `class` or `data-*` rides the same span, in the writer's slot order, so
`<kbd id="k" class="key">Tab</kbd>` is `[Tab]{#k .key kbd}` - the consumed name
last, not first.

**Three of the seven are core; four are the SemanticSpan extension's.** `kbd`,
`abbr` and `time` are core names and come back as their elements anywhere.
`samp`, `var`, `cite` and `dfn` are the extension's, so `[out]{samp}` renders
`<span samp="">out</span>` in a core processor and `<samp>out</samp>` only
where the extension is registered. That is still what an importer should write:
the semantic survives as an attribute a reader can recover by enabling the
extension, where unwrapping the element discarded it outright. It is not a full
round trip through a core render, and the `semantic-spans-extension` fixture
exists to keep the two cases apart.

Three elements deliberately do NOT take this form:

- `<mark>` maps to `=m=`, which is lossless and idiomatic. One input with two
  spellings across importers is the thing to avoid.
- Inline `<code>` maps to a code span, `` `c` ``.
- `<code>` inside `<pre>` maps to a code block. The compact form is the inline
  case only.

None of the seven is active content - no URL, no event handler, no script - so
`safe` maps them exactly as `semantic` and `roundtrip` do, and none of them
needs a mode branch. An event handler on one of them is still stripped and
still diagnosed: the mapping renames the element, it does not exempt it from
hardening.

## Lists keep the source's tightness

A bare-text `<li>` imports as a TIGHT list item; `<li><p>...</p></li>` stays
loose. HTML draws the tight/loose distinction the same way Carve does, and
import preserves what the source spelled rather than normalizing it.

```html
<ul><li>one</li><li>two</li></ul>
```

```
- one
- two
```

```html
<ul><li><p>one</p></li><li><p>two</p></li></ul>
```

```
- one

- two
```

Carve spells tightness per LIST, not per item, so a MIXED list has to resolve
one way. It resolves the way CommonMark resolves it: one paragraph item
loosens the whole list. Normalizing the other direction would drop the
paragraph that item spelled, which is the loss this rule exists to prevent.

```html
<ul><li>one</li><li><p>two</p></li></ul>
```

```
- one

- two
```

The three shapes are pinned as converter-corpus cases 27, 28 and 23.

## Modes

- `safe` is the default for arbitrary input. It removes active content and
  event handlers and does not preserve raw HTML or source-provenance metadata.
  Harmless attributes with a Carve representation remain structured.
- `semantic` is for trusted CMS/editor input. It additionally applies the
  explicit CSS mappings and editor adapter metadata defined by the importer.
- `roundtrip` is only for HTML emitted by a Carve implementation. It may honor
  Carve provenance metadata and preserve otherwise unsupported markup as raw
  HTML. It is not safe for untrusted input.

All modes remove `script`, `style`, `template`, `noscript`, and event-handler
attributes. `roundtrip` may recover source embedded by a Carve renderer, but
must never execute it.

## Result and diagnostics

Import APIs return both the document and an ordered diagnostic list. Every
lossy decision should be observable. The common diagnostic codes are:

- `element-dropped`: an element and its contents were removed.
- `element-unwrapped`: an unsupported element was replaced by its children.
- `attribute-dropped`: an attribute was not represented.
- `style-unmapped`: CSS had no explicit semantic mapping.
- `table-degraded`: a table could not be represented structurally.
- `raw-preserved`: unsupported trusted markup was retained as raw HTML.
- `structure-unspellable`: the import produced a structure Carve source has
  no spelling for, so it survives in the AST and not in written Carve. The
  AST-returning entry point loses nothing and reports nothing; the one that
  writes source reports this.
- `encoding-assumed`: the source did not declare how to read a value, and the
  importer assumed an encoding to map it. An importer MUST emit this whenever
  the node it produced is only correct if that assumption holds. The motivating
  case is `<math alttext="...">` with no `<annotation encoding="...">`: MathML
  never says what `alttext` contains, so reading it as TeX is a guess, and the
  math node may hold something that is not TeX at all.
- `diagnostics-truncated`: the diagnostic cap was reached.

`encoding-assumed` is deliberately not filed under `element-unwrapped`.
Unwrapping is a note about the input's structure and loses no meaning;
an assumed encoding is a warning about the output. A consumer told only that an
element is gone cannot tell a harmless structural event from content that may
be in the wrong language entirely, and that is the one signal it could act on.

Diagnostics have `code`, `message`, `severity` (`info`, `warning`, or `error`),
and optional `path`, `line`, and `column`. Their order follows document order.

## The `path` of a diagnostic

`path` locates the node a diagnostic is about. It is a HUMAN-READABLE,
engine-defined locator, and it is NOT an XPath expression. A consumer MUST NOT
resolve it against the input document; it exists for a person reading a report.

Implementations converge on one spelling. A path is rooted at the fragment's
body children: there is no `/html[1]/body[1]` prefix, and no step for a wrapper
element the importer added.

Each step's index counts among ALL of the parent's child nodes, text nodes
included, not among the same-named siblings.

```html
<p><abbr class="x" id="z" title="y">A</abbr> <kbd id="k" class="key">Tab</kbd> <abbr title="a b c">S</abbr> <abbr title="">E</abbr> <time datetime="">T</time> <kbd onclick="steal()">Esc</kbd></p>
```

The last `<kbd>` is the eleventh child of the paragraph, preceded by five
elements and five whitespace text nodes, so it is reported at

```
/p[1]/kbd[11]
```

and not at `kbd[2]`, its position among the `kbd` elements, nor at `kbd[6]`,
its position among the elements.

A path names the importer's traversal, not the raw DOM. Table sections are
flattened and rows are renumbered across the whole table, so a `<td>` inside a
`<tbody>` that follows a `<thead>` carries no `tbody` step.

```html
<table><thead><tr><th>H</th></tr></thead><tbody><tr><td onclick="x()">B</td></tr></tbody></table>
```

```
/table[1]/tr[2]/td[1]
```

The notation invites the XPath reading, and the reading is false. Every value an
importer emits is valid XPath SYNTAX that finds nothing. Resolved as XPath
against the paragraph above, `/p[1]/kbd[11]` selects zero nodes, and it misses
on two counts at once: the root step, because a parsed fragment puts the
paragraph under `/html[1]/body[1]`, and the predicate, because XPath counts
`kbd` among its like-named siblings, where that node is `kbd[2]`. The node an
XPath engine actually reaches is `/html[1]/body[1]/p[1]/kbd[2]`, which no
importer writes.

The field is therefore deliberately not machine-checkable. The schema gives it
no pattern, and an implementation MAY change how it spells a path without that
being a breaking change to the report format.

## Required API surface

JavaScript exposes `htmlToAst(html, options)` and `htmlToCarve(html, options)`.
Rust exposes `html_to_ast` and `html_to_carve`. PHP exposes
`convertWithReport`; its existing `convert` method remains a source-only
convenience API. CLIs expose `carve migrate --from html`, with `--mode`,
`--report`, and `--check-loss`.

Adapters may normalize editor-specific markup before the core policy. The
portable adapter names are `generic`, `tiptap`, `prosemirror`, `ckeditor`,
`tinymce`, `word`, and `google-docs`. Unknown adapters must be rejected.

## Conformance fixtures

Each directory under `tests/html-import` contains `input.html`,
`expected.crv`, `expected.ast.json`, and `expected.report.json`. Implementations
may add platform-specific fixtures, but shared fixtures define the portable
minimum. AST comparison ignores object-key order and absent optional fields;
source comparison uses the canonical writer byte-for-byte. Diagnostic fixture
objects are minimum matches: implementations may add optional location fields.

The shared set is deliberately small and each directory has one subject:

| fixture | subject |
| --- | --- |
| `basic` | a heading, emphasis and a link - the shape everything else assumes |
| `security` | an event handler and a `<script>` removed, and said so |
| `semantic-spans-core` | `kbd`, `abbr` and `time`, the three core names |
| `semantic-spans-extension` | `samp`, `var`, `cite` and `dfn`, which need the extension to render as elements |
| `semantic-span-attributes` | a consumed value beside a leftover `id`/`class`, a value that needs quotes, an empty value, and an event handler still stripped |
| `semantic-span-carve-outs` | `<mark>`, inline `<code>` and `<pre><code>`, none of which take the compact form |

Because source comparison is byte-exact, every `expected.crv` here is also a
fixed point of `carve fmt` in all three engines. A fixture that is not one
would be pinning source no writer produces, and the first engine to run its
formatter over it would disagree.

## CSS policy

CSS is not parsed generally. Implementations may map only explicit declarations
with stable Carve semantics, initially `text-align`, `font-weight`,
`font-style`, and `text-decoration`. All other declarations produce
`style-unmapped` in `semantic` and `roundtrip` modes.

## Resource limits

Importers must bound DOM depth, AST depth, node count, and diagnostic count.
On a structural limit, return or throw a typed error rather than emitting a
partial document. A diagnostic cap may instead replace its last entry with the
`diagnostics-truncated` error diagnostic.
