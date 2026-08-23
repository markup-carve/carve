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

## Block structure Carve can spell

Two block-level shapes carry structure an unwrapping importer throws away, and
Carve has a spelling for each, so each is KEPT (markup-carve/carve#1286).

| HTML | Carve | what would otherwise be lost |
| --- | --- | --- |
| `<figure>` + `<figcaption>` | the target block, then a `^ caption` line | the figure itself: unwrapping both elements glues the caption text onto the image, and re-reading that gives a paragraph |
| `<blockquote cite="U">` | `{cite=U}` on the line above the quote | the attribution URL, which no other channel carries |

A `<figure>` holding an image and a caption is exactly the source Carve's
caption line produces, so the import is a round trip rather than a rescue:

```html
<figure><img src="i.png" alt="a"><figcaption>cap</figcaption></figure>
```

```
![a](i.png)
^ cap
```

The `cite` attribute rides the block-attribute line, which is the ordinary
channel for an attribute on a block:

```html
<blockquote cite="u"><p>q</p></blockquote>
```

```
{cite=u}
> q
```

Both rows go the lossless way for the same reason, and it is not a preference
for richer output. Dropping either one is an option only WITH a diagnostic
attached, because the loss report exists so that nothing leaves quietly - and
keeping them costs less than the diagnostic would. Neither of the two imports
above emits a diagnostic, because neither loses anything.

The caption line is the target's, not the document's: a `<figcaption>` that
sits before its target in the source still imports as the line AFTER it, since
that is where Carve spells a caption for the block above.

**One target is the exception, and it is the one Carve has no source for.** A
figure wrapping a TABLE is an AST shape no Carve document spells (PART 12
§17): the caption line on a table is the table's own `<caption>`, so the
`<figure>` element itself has nowhere to go. That import is still the best
available source, and it is diagnosed rather than silent:

```html
<figure><table><tr><td>x</td></tr></table><figcaption>cap</figcaption></figure>
```

```
| x |
^ cap
```

with `structure-unspellable` on the `<figure>`. Every other captionable target
- an image, a quote, a code block, a paragraph - keeps its figure and reports
nothing.

## A container comes back as the container

A colon fence renders to one of exactly two shapes, and an importer reads that
mapping backwards. A Tier-1 kind renders as
`<aside class="admonition {kind}">`; every other kind - a tab set, a code
group, a panel, a container an extension invented - renders as
`<div class="{kind}">`. Either one imports as the container it was written
from, with the structural class CONSUMED as the fence word rather than kept
beside it:

```html
<aside class="admonition note" aria-label="Note"><p>body</p></aside>
```

```
::: note
body
:::
```

**The rule is the inverse of the renderer, not a list of names.** A list would
cover the containers that exist today and go on unwrapping the next one, and
the loss it leaves is invisible to an HTML-to-HTML check: an unwrapped
`<aside>` re-renders as the same `<p>` it went in as, and a
`<div class="tabs">` kept as a `div` node carrying a `.tabs` class re-renders
byte-identically. Only the NODE moved, so the document stopped being a callout
while looking exactly like one (markup-carve/carve-js#1295).

A NESTED container widens INWARD. A colon fence closes on an exact length
match (PART 9 §12), so "longer-outer documents and longer-inner ones both
parse" and the direction is a writer's choice - which the rule at the top of
this page has already made: `carve fmt` emits the inward-widening form, so an
importer does too. It is not the code fence's relation, where the length axis
really is quoting and the outer fence must be able to hold a shorter one.

```html
<div class="tabs"><div class="tabs-panel"><p>a</p></div></div>
```

```
::: tabs
:::: tabs-panel
a
::::
:::
```

An importer that instead reads the width off the body it has already written
can only widen outward, so it inverts every depth at once
(markup-carve/carve-php#1583). `container-nesting` pins two and three levels.

The class the fence word consumes must be one a fence opener can spell,
`[a-zA-Z_][\w-]*` per PART 9's `admonition_open`. A class outside that shape -
`2col` - would be written after the colons and read back as a paragraph, so
that element keeps the generic `div` node where the class survives as a class.

A TITLED callout's `<p class="admonition-title">` is the container's title, not
its first body block, and the `aria-labelledby` pointing at that paragraph is
consumed with it: a lifted title is no longer an element with an id, so a
reference left standing would name nothing. A title slot holds inline content
and has no attribute slot, so anything else the paragraph carried is reported
as `attribute-dropped`.

Nothing here is diagnosed on its own account, because nothing is lost: the
renderer writes the class, the name and the reference back from the node.

**An endnotes section is deliberately NOT in this family.** A
`<section role="doc-endnotes">` that nothing references imports as the `<hr>`
and `<ol>` it is built from, not as a footnote definition. An unreferenced
definition renders to the empty string, so rebuilding one there would delete
the note's text from the document while reporting nothing - a loss where the
degraded form keeps every byte a reader could see. A footnote whose
`role="doc-noteref"` reference IS present rebuilds as a footnote, which is the
shape a rendered document has.

## A flattened boundary keeps a separator

A caption line holds inline content only, so a `<figcaption>` carrying two
paragraphs is FLATTENED - and the boundary between them has to survive the
flatten as bytes, because the slot has nowhere to put a node for it. PART 11
§1b requires a separator at every such boundary, and the canonical one is a
single space:

```html
<figure><img src="/i" alt="x"><figcaption><p>one</p><p>two</p></figcaption></figure>
```

```
![x](/i)
^ one two
```

Without it the two blocks are joined instead of separated, and the join is read
back as one thing rather than two: `onetwo` is one word, `*a**b*` is one strong
run holding a literal asterisk, and two adjacent code spans become one span
holding the delimiters that used to end and begin them. Nothing is dropped in
any of those, so no diagnostic fires - the `element-unwrapped` note says a
`<p>` was unwrapped and says nothing about what the unwrapping joined.

A block that contributes NO token is not a side, so it takes no separator of
its own: `<p>a</p><p></p><p>b</p>` in a caption is `a b`, never `a  b`.

The rule is not confined to a caption. Every inline-only slot an importer can
reach takes the same separator, and the test is the same one: re-reading the
emitted slot must draw no token - no word, no delimiter run - from both sides
of the join.

A character that was TEXT and turns into a live delimiter once its neighbour
arrives beside it is a different question, already answered by the writer's
escaping rule: `<p>a *b</p><p>c* d</p>` flattens to `a \*b c\* d`, with the
asterisks escaped because the writer reads its own output.

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

## A derived attribute does not come back

An importer **drops an attribute whose value equals what the renderer derives
for that element, and keeps every other one** (PART 9 §16a). It is the rule a
`<th>`'s generated `scope` and a generated `colspan`/`rowspan` already follow,
and it reaches every accessible name PART 9 §16a and
[extensions §1.5](./extensions#_1-5-the-strings-an-extension-writes-itself)
make engine-written: the name on an untitled admonition, an endnotes section, a
footnote backlink, a tab set and a `css`-mode tab panel, plus the `role` beside
each.

````html
<pre class="mermaid" role="img" aria-label="mermaid">graph TD; A--&gt;B;</pre>
````

````
{.mermaid}
```
graph TD; A-->B;
```
````

Both `role="img"` and `aria-label="mermaid"` are values the renderer writes
for this element - the name defaults to the extension's own class word - so
both attributes go. The `class` itself is the author's and stays: it is what
the renderer reads to write them back.

Nothing is diagnosed: the renderer puts the two attributes back, so no
`attribute-dropped` fires, for the same reason the `<figure>` and
`<blockquote cite>` imports above report nothing.

**Provenance is not the test**, because the HTML never says who wrote an
attribute. Where the value EQUALS the derived one the output is identical
either way, so the drop is a no-op for what a reader hears - and it is the only
thing that keeps a `labels` map reaching a document that has been through an
import. A kept `aria-label="Note"` is indistinguishable from an authored one,
so the author-wins rule makes it win: the same source re-rendered with
`admonitionNote` set to `Hinweis` still says `Note`.

**A name that DIFFERS is kept**, always. That is the half a blanket
`aria-label` drop cost before, and the rule does not spend it:

````html
<pre class="mermaid" role="img" aria-label="Architecture overview">graph TD; A--&gt;B;</pre>
````

````
{.mermaid aria-label="Architecture overview"}
```
graph TD; A-->B;
```
````

Two limits come with it, both accepted. Attribute ORDER moves, because a
regenerated name lands where the renderer appends it rather than where the
author's attributes sit - which restores the canonical order rather than
disturbing one. And the rule catches the DEFAULT only: HTML rendered with a
German map carries `aria-label="Hinweis"`, which matches no default, so it is
kept. An importer MAY take the same `labels` map the render used and match
against that as well, closing the residue; it is not required.

**The test for this is not a round trip.** An untitled admonition round-trips to
byte-identical HTML *while* being permanently unlocalizable, so a round-trip
assertion passes with the defect present. The assertion has to be that a derived
name is ABSENT from the imported source, which is what
`tests/a-derived-name-is-absent-from-imported-source.test.mjs` reads off the
`derived-accessible-name` fixture.

### What makes a value derived

A value is derived where the importer can **rebuild it from the element it is
reading** - the tag, the classes, the `role`, the element's own text, a control
beside it, or the documented default of a `labels` key - and the value present
equals that rebuild. That is the whole test. The list of shapes above is not
one: a list grows an entry every time the question recurs, and an importer
keyed on one entry is a check that cannot fail for the rest of the family.

Reconstructability is what makes the equality test stand in for the provenance
test the HTML cannot answer. A value the importer can compute is one the
renderer computed, whichever of them ran first. A value the element does not
determine is the author's, and is kept.

**A wrapper element can be derived too.** The endnotes `<section>` is: PART 9
§16 writes one around the notes whenever the document has any, and no Carve
construct spells a `<section>`. So unwrapping it removes nothing an author
wrote, and it is reported neither as `element-unwrapped` nor as an
`attribute-dropped` naming the `doc-endnotes` role or the `endnotes` name that
came with it. Whether a NON-derived wrapper is reported is not settled here.

**The import's outcome does not change the answer.** Derivation is a property
of the element being read, not of what the import does with it. A referenced
endnotes section is consumed into footnote definitions and the renderer writes
the section back; a reference-less one degrades to the `<hr>` and `<ol>` it is
built from, and the renderer writes no section for it at all. The second still
reports nothing, because the author still wrote none of it. An importer that
asks its own emitted document whether the value came back answers no for the
degraded form - correctly, and about the wrong question.

Everything the property does not reach is still reported. An authored `class`
on an endnotes section, and an `aria-label` no default matches, each go out with
a row when the section is unwrapped; suppressing the element row and the
attribute row together silences both.

The shape is pinned as the `derived-endnotes-section` fixture.

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
included, not among the same-named siblings. Exactly three exemptions from that
basis exist, and the list of them below is exhaustive.

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

The two rules meet where a wrapper is dropped, and they are one rule: an index
counts among the children of the parent the step it prints SITS UNDER. Where a
bare inline run is wrapped in a paragraph the importer synthesized, the wrapper
contributes no step, so the run is numbered among the fragment's body children
and not among the nodes of the wrapper.

```html
<p>z</p><kbd onclick="x()">K</kbd>
```

The `<kbd>` is the second body child, so it is reported at `/kbd[2]`. `/kbd[1]`
is its position inside the synthesized paragraph, a parent no step names, which
makes the index unreadable at the level it is printed at
(markup-carve/carve#1554).

A path names the importer's traversal, not the raw DOM. Table sections are
flattened and rows are renumbered across the whole table, so a `<td>` inside a
`<tbody>` that follows a `<thead>` carries no `tbody` step.

```html
<table><thead><tr><th>H</th></tr></thead><tbody><tr><td onclick="x()">B</td></tr></tbody></table>
```

```
/table[1]/tr[2]/td[1]
```

Where the traversal renumbers, it is the index basis too, and those are the ONLY
exemptions from counting among all child nodes. There are exactly three, because
the importer reads their parent through a shape of its own:

- an `<li>` is numbered among the list's ITEMS;
- a `<tr>` among the table's ROWS, flattened across its sections;
- a table CELL, `<td>` and `<th>` alike, among the CELLS of its row.

Counting exemptions rather than element names is deliberate: the cell case is
ONE rule over two element names, and an implementation that took it for `<td>`
and not for `<th>` would have a header cell and a body cell of the same row
answering to different bases.

Every other element kind counts among all of its parent's child nodes, a `<dd>`
and a `<figcaption>` included. The three are the whole of it: an importer MUST
NOT number any other kind among its same-named siblings. That is why the row
above is `tr[2]` and its cell `td[1]` however much whitespace the table is
written with, while a `<dd>` in a `<dl>` written across lines is `dd[4]`
(markup-carve/carve#1554).

One path can carry both bases, and which it uses turns on the parent rather
than on the step:

```html
<ul>
<li>a</li>
<li>b <kbd onclick="i()">K</kbd></li>
</ul>
```

```
/ul[1]/li[2]/kbd[2]
```

The `<li>` is the second ITEM and the fourth child of the `<ul>`, so the item
basis applies; the `<kbd>` is the second CHILD of that item, and no shape
renumbers an item's children, so the ordinary basis applies. Numbering the
`<li>` among all children instead would print `li[4]`, a number that counts
markup a reader of a list does not see. The three exemptions came in together
with the convergence on one convention, for the reason the table rows are
flattened: the path names the traversal the conversion performs, and these are
the parents that traversal reads through a shape of their own
(markup-carve/carve#1257, markup-carve/carve#1556).

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
| `figure-caption` | a `<figure>` with a `<figcaption>`, which imports as the image and a caption line |
| `blockquote-cite` | a `<blockquote cite>`, whose attribute is kept on a block-attribute line |
| `derived-accessible-name` | a diagram fence's derived `role` and name, dropped, beside an authored name that is kept |
| `derived-endnotes-section` | a reference-less endnotes `<section>`, whose wrapper and both attributes are derived, so nothing is reported |
| `synthesized-wrapper-path` | a bare inline run wrapped in a paragraph the importer added, whose diagnostic is numbered among the body children rather than inside the wrapper |
| `container-round-trip` | a rendered callout and a named container, which come back as the containers they were written from rather than as a body and a `div` |
| `caption-attributes` | an attribute on a `<figcaption>`, dropped because a caption line has no slot for it, and reported rather than dropped in silence |
| `table-caption-attributes` | an attribute on a table's `<caption>`, the other spelling of a caption line, reported by the same rule |
| `container-nesting` | containers two and three deep, whose fences widen INWARD because that is the form `carve fmt` writes |

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
