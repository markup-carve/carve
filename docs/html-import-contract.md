---
description: The normative element mapping, diagnostics, and API contract for Carve HTML importers.
---

# HTML import contract

This page is for importer and engine authors. For choosing a mode, reviewing
diagnostics, and running a migration, start with [Import HTML](./html-import).

> [!TIP]
> For application integration, start with the API, mode, and result sections.
> The pipeline, element mapping, and fixture rules are the implementation
> contract for importer authors.

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

## The two exits say the same thing

An import has two exits and they are one import: `htmlToAst` returns the tree,
`htmlToCarve` returns source the canonical writer wrote FROM that tree. So what
the source says and what the tree says are the same claim, and the invariant is
stated rather than assumed:

```
parse(htmlToCarve(h)) == htmlToAst(h)
```

modulo escaping - PART 11 §1's EQUALITY IS MODULO ESCAPING - and modulo source
positions, which imported nodes do not carry at all.

ONE CARVE-OUT, and it is one this page already names. `structure-unspellable`
exists for a tree Carve source cannot spell, and it is reported on the exit that
writes source. Where a row carries it the two exits differ by exactly the
structure that row names, and this invariant is not the rule that applies. The
carve-out is not this page's own: PART 11 §1c states the writer-side ceiling it
sits inside, over what a shape SPELLS rather than over a node type, and names
this code as what a producer with a diagnostic channel owes for one.
Everywhere else a difference is a defect. Which of the two exits is the wrong
one is a separate question, and the invariant deliberately does not answer it.

WHY IT NEEDS SAYING: nothing compared them. A fixture records an
`expected.ast.json` beside an `expected.crv`, and every runner reads each of
them against an engine and neither against the other, so an importer whose tree
and whose source disagree is green twice over. That is how three shapes arrived
here at once (markup-carve/carve#1601) - a table cell, an anchor and a text run,
each of which leaves `htmlToCarve` meaning something the `htmlToAst` tree never
said. Writing the check found two more in fixtures that had been read and
reviewed. Both are settled now: a `<figure>` whose target the tree wrapped in a
paragraph no source spells (markup-carve/carve#1606), where the TREE was the
wrong exit and the fixtures now record the target itself, and a one-item
`<li><p>` list whose tree said loose where its own source said tight
(markup-carve/carve#1607, which needed a call rather than a derivation - the
call is PART 9 section 17 L7's `{loose}`, and the importer now writes it).

THE SOURCE IS THE ARTIFACT A MIGRATION KEEPS, which is what makes the invariant
worth more than either exit alone. A reader who runs `carve migrate` keeps
bytes; the tree is a claim about what those bytes will mean when something
parses them back. An importer that reports a clean migration and writes source
saying something else has failed at the one job a migration boundary is for.

`tests/the-two-import-exits-agree.test.mjs` reads the invariant off the shared
fixtures, and carries a declared ledger for the fixtures that do not meet it
yet.

## Code-block language hints

HTML import recognizes explicit code-language hints in `safe`, `semantic` and
`roundtrip` modes whenever HTML maps to a code block. Recognition supplies
`code_block.lang` without removing wrappers or consuming additional attributes.
Existing raw-preservation paths, security checks and attribute diagnostics still
apply. Wrapper IDs and classes remain on their existing carriers.

Match these spellings case-sensitively on the parsed DOM. Split HTML class values on ASCII whitespace, not a host language's broader Unicode whitespace class.

| Convention | Eligible location | Producer or convention |
| --- | --- | --- |
| `language-X` | Direct `code` child or `pre` | CommonMark-style HTML, Prism, highlight.js |
| `lang-X` | Direct `code` child or `pre` | Google Prettify |
| `data-lang="X"` | Direct `code` child or `pre` | Hugo / Chroma |
| `brush: X` or `brush:X` | `pre` class attribute | SyntaxHighlighter-style metadata, including MDN |
| `highlight-source-X` | Eligible wrapping `div`, also carrying `highlight` | GitHub |
| `mw-highlight-lang-X` | Eligible wrapping `div`, also carrying `mw-highlight` | MediaWiki SyntaxHighlight |
| `highlight-X` | Eligible Sphinx wrapping `div` described below | Sphinx's wrapper around Pygments output |

The producer column documents provenance; it does not require hostname checks, a generator meta tag, network access, or a registry of installed highlighters. Generic Pygments `class="highlight"` alone carries no language.

### Wrapper eligibility

Support these shapes:

- GitHub: `div.highlight.highlight-source-X > pre`.
- MediaWiki: `div.mw-highlight.mw-highlight-lang-X > pre`.
- Sphinx: `div.highlight-X > div.highlight > pre`. Additional classes such as `notranslate` are allowed. The inner `div` must contain the exact class token `highlight`.

At each wrapper level, the child shown above must be the only element child. Other child nodes may be comments or text containing only ASCII whitespace. Substantive text, another element, or another code block makes that wrapper ineligible. Attributes do not prevent language lookup and remain subject to the existing import policy.

Sphinx needs both wrapper levels. All 34 Python examples in the saved corpus use that nesting. A direct-parent-only rule would miss them.

Do not search farther ancestors or cross other elements. Wrappers containing copy buttons, captions or line-number tables are outside this rule. Preserve their ordinary import behavior; do not guess which children are disposable. [Pygments can emit separate line-number and code cells](https://pygments.org/docs/formatters/#HtmlFormatter), so treating every descendant `<pre>` as the code target is unsafe.

### Candidate parsing and precedence

Use the direct `<code>` child already selected by the code-block importer as the code-level source. This rule does not change how malformed `<pre>` content or multiple `<code>` children are selected or flattened.

1. Inspect the selected `code`, then `pre`, then its eligible wrapper. Choose the first location with a valid candidate.
2. On `code` and `pre`, try `language-X`, `lang-X`, `data-lang`, then `brush:` where permitted. Within one class convention, use the first valid occurrence in class-attribute order. Within `brush:`, use the first valid declaration in source order.
3. On a wrapper, try `highlight-source-X`, then `mw-highlight-lang-X`, then the Sphinx `highlight-X` form, subject to each shape's eligibility. Never reinterpret a token beginning `highlight-source-` as Sphinx's `highlight-X`, even when its GitHub suffix is invalid.
4. Skip empty or invalid candidates and continue in that order. If none is valid, leave the code block without a language.

Location takes priority over convention. Thus `<pre class="language-js"><code data-lang="python">...</code></pre>` imports with `lang: "python"`. A `<code>` without a valid hint falls back to `<pre>`.

Trim leading and trailing ASCII whitespace from `data-lang` before validation. Class-prefix suffixes must occupy the complete class token. Preserve the selected value's case and spelling; do not map aliases such as `py`, `python3`, `shell` or `console` to another name. Unknown but valid language tokens are allowed.

For `brush:`, scan the original class value before any class normalization. A declaration starts at the beginning of the value or after ASCII whitespace or `;`, followed by the exact text `brush:`, optional ASCII whitespace, and a nonempty value ending at ASCII whitespace, `;`, or the end of the attribute. Validate that entire value. This accepts `brush: html notranslate`, `brush:html;` and `brush: html; gutter: false;`. Quoted values are outside this rule. Other option text contributes no language candidate and is not deleted by recognition.

Treat `none`, `plain`, `text` and `plaintext` as explicit valid values that stop fallback. This prevents a nearer explicit value from being replaced by a wrapper hint. Full [Prism ancestor inheritance](https://prismjs.com/) is outside this rule.

### Validation, preservation and reports

Validate every candidate, including existing `language-X`, against Carve's complete `language_info` production: one or more ASCII letters, digits, `-`, `_`, `+`, `#`, `.`, or `/`. A full-string check is required. Accept `c++`, `c#`, `f#`, `asp.net` and `text/html`; reject `=html`, `python:3`, embedded whitespace, backticks and quotes. Never repair an invalid candidate into a different language.

Extraction does not mutate the DOM or remove winning, duplicate, conflicting or invalid hints from their source attributes. The existing attribute mapper remains responsible for their representation and any losses. A successfully selected language needs no new diagnostic. Skipping a candidate or choosing among conflicting candidates does not suppress ordinary attribute-loss, security or structural diagnostics.

Wrapper lookup must obey existing DOM depth and node limits. It inspects at most the two wrapper levels named above. Code text extraction, HTML entity decoding, whitespace and trailing-newline handling are unchanged.

HTML's natural-language `lang` attribute, arbitrary unprefixed classes, source-text guessing, and extension activation are outside this rule. A language hint supplies metadata to a code block; it must never change that node into raw HTML, math or another construct.

The shared `tests/html-code-language-cases.json` matrix specifies language
selection, including rejected candidates, for all three engines. The
`code-language-hints` fixture pins source, AST and diagnostics for representable
cases. Brush cases also run through each engine's writer and parser to verify
code content and language; the separate class-normalization defect is not
recorded as a correct full-AST round trip.

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

## Ruby keeps base and annotation paired

A valid HTML `ruby` imports as the interchange-only `ruby` inline node from
PART 12 §32. The importer applies the WHATWG ruby segmentation algorithm to
the parsed DOM. Each valid segment becomes one `pairs` entry: its base nodes
go in `base`, and its first associated `rt` content goes in `annotation`.
An empty `rt` is valid and produces `annotation: []`; for example,
`<ruby>字<rt></rt></ruby>` falls back visibly as `字()`. Whitespace follows
the WHATWG algorithm rather than a second Carve-specific segmentation rule.
Each additional associated `rt` becomes ordinary `(<annotation>)` content
immediately after its pair and reports `element-unwrapped` with degraded
fidelity. Nested `ruby` elements are read recursively.

`rp` is fallback presentation and does not enter the AST. Empty `rp`, ASCII
parentheses and fullwidth parentheses, ignoring surrounding HTML whitespace,
are accepted without a diagnostic. Any other non-empty `rp` is dropped with
`element-dropped` and `fidelity: "degraded"`; base and annotation content
still survive.

The obsolete `rb` and `rtc` elements use a compatibility path. `rb` unwraps
into base content before segmentation. Each `rtc` is removed before
segmentation and retained in DOM order. Its `rt` wrappers unwrap into one
content sequence, and its `rp` children follow the rule above. After all output
for the original `ruby` element, each retained `rtc` becomes ordinary inline
`(<content>)` and reports `element-unwrapped` with degraded fidelity. This
preserves a second annotation level visibly without inventing an association
the first-version AST cannot hold.

A base segment with no annotation becomes ordinary inline base content with
no parentheses and reports `element-unwrapped` with normalized fidelity. An
annotation with no base becomes ordinary `(<annotation>)` content and reports
the same code with degraded fidelity. Either case splits a run; other valid
segments remain structured. The importer never emits an empty `pairs` array
or an empty `base`.

When the whole element maps to one structured `ruby` node and no fallback
content, attributes on the outer element become `ruby.attrs`. If segmentation
splits the element into structured and ordinary content, one attributed `span`
wraps the complete output and the inner `ruby` nodes carry no copy. Attributes
on `rt`, `rb` or `rtc` report `attribute-dropped` without removing their visible content.
Every recursive pass reaches base before annotation in pair order, including
URL sanitization. Safe, semantic and roundtrip modes use the same mapping.
Past the ordinary DOM or AST depth bound, import returns or throws the existing
typed structural-limit error and never emits a partial tree.

The AST-returning exit reports no structural loss for valid ruby. The
source-writing exit uses readable `base(annotation)` fallback and reports
`structure-unspellable`, because Carve 0.1 cannot retain the pairing.

## A destination Carve cannot carry is not a destination

A `link` node needs a destination and an `image` node needs a source, and Carve
spells both in the same slot. It has NO spelling for an empty one: `[t]()` and
`![t]()` are literal text. So an importer that writes the empty slot has not
written a link, it has written four punctuation characters the HTML never held,
into the middle of the prose.

THE RULE IS OVER THE DESTINATION, not over the reason it is missing. An `<a>`
with no `href`, an `<a href="">`, and an `<img>` whose `src` is either of those,
are ONE shape: the element names no destination the source can carry. For any of
them the importer produces NO link or image node, and writes what the element's
CONTENT and its SURVIVING attributes would produce without it - the span where
an attribute survives, the bare content where none does. That is the
unwrapped `<div>` boundary one layer down, and it is the same boundary
because it is the same question: what is the element still needed to hold?

```html
<p><a href="">click here</a> and <a id="k">a named one</a></p>
```

```
click here and [a named one]{#k}
```

AN IMAGE'S CONTENT IS ITS ALTERNATIVE TEXT. That is what every target with no
image shows for it, and what a browser shows for one it cannot load, so it is
the text a reader of this document was going to see either way.

EMPTY IS A PROPERTY OF THE STRING, read the way an HTML URL attribute is read: a
value of zero length, or of zero length once leading and trailing ASCII
whitespace is stripped, because that is what a URL parser strips before
resolving one. A value that is merely unusual is not empty and is kept.

The element is reported as `element-unwrapped`. A link that comes back as prose
is a lossy decision, and this page requires those to be observable. It is not
the bare `<div>`'s case, where nothing was lost because nothing was carried: an
anchor has a slot for a destination, and this one is standing empty.

**THE SECURITY HALF, AND WHY AN IMPORTER MUST NOT REBUILD THE LINK.** This is
not hypothetical input. It is what Carve's own renderer EMITS: PART 9 §25's URL
sink denylist blanks a destination whose scheme is dangerous, emitting
`href=""` or `src=""` while keeping the visible text, because WHAT IS BLANKED IS
THE DESTINATION, NOT THE TEXT. Seven corpus documents are exactly that output.
An importer reading a hardened render therefore turned the renderer's deliberate
half-measure into visible punctuation, and did so on the documents whose output
had been thought about hardest.

WHAT THE ROUND TRIP OWES THERE IS THE TEXT, and nothing else. The destination is
gone from the HTML by design: the renderer withheld it and wrote no provenance
for it, so there is nothing in the document to rebuild it from. An importer MUST
NOT ATTEMPT TO RECONSTRUCT IT - not from a `title`, not from the anchor's own
text, not from a Carve provenance attribute in `roundtrip` mode, not from
anything. Any route that produced a destination here would be reconstructing the
exact value a security rule removed, which would make the importer a way around
PART 9 §25 rather than a reader of its output. Keeping the text and writing no
link is the whole of what is owed, and it is the outcome this rule already
reaches.

`destination-less-link` pins the anchor, the image and the surviving-attribute
side.

## A denied destination is not a destination either

A destination whose scheme PART 9 §25's sink denylist blanks (`javascript`,
`vbscript`, `data`, `file` and the OS-handler schemes such as `ms-msdt`) is
imported exactly like an empty one: no link or
image node, only the content and any surviving attributes (carve#2254). The
scheme is read the way the sink reads it, with controls and whitespace removed
first, so `java&#9;script:` is denied too.

```html
<p><a href="javascript:alert(1)">click here</a></p>
```

```
click here
```

Writing it would put a destination in the source that no Carve target ever
emits. Every Carve renderer blanks it, and a tool without that denylist that
turns the source into a link gets live script, because a browser percent-decodes a `javascript:` URL before it
runs it. It is also what the empty-destination rule already produces for
Carve's own rendering of this input, `href=""`, so importing the HTML and
importing its render give the same document.

It takes one row, `attribute-dropped` at `warning`, the level of a dropped
event handler, with the message `Dropped href with a denied URL scheme on <a>`
or `Dropped src with a denied URL scheme on <img>`. There is no separate
`element-unwrapped` row: the unwrap follows from the drop and says nothing
more. This applies in every mode, `roundtrip` included, since no Carve
renderer writes such a destination for it to recover.

`denied-scheme-destination` pins the anchor, the image and the split scheme.

## An unsupported element gives way to its children

Importing `<x>C</x>` for an element `x` the importer does not support produces
the same document as importing `C` in that position (carve#2341). Block
children stay blocks and inline children stay inline, however deep the
unsupported elements nest and whether or not the tag has a hyphen. Loose text
beside a block becomes a paragraph of its own, as it would without the wrapper.

```html
<react-app><h1>Title</h1><p>Body</p><ul><li>one</li></ul></react-app>
```

```
# Title

Body

- one
```

This matters on real pages: custom elements such as `<react-app>` and
`<turbo-frame>` wrap whole documents, and rebuilding their children as inline
content collapsed every heading, list and code block into one line.

Each unsupported element takes one `element-unwrapped` row at `info`, with
`degraded` fidelity, located at the element itself. Its children are imported
as they would be anywhere and add no rows of their own.

`unsupported-element-keeps-its-blocks` pins a wrapper around blocks, loose text
beside a block, a tag without a hyphen, two nested wrappers, a wrapper inside a
list item and an inline wrapper inside a paragraph.

## A section wrapper gives its id back to its heading

The renderer wraps every heading in a `<section>` and moves the heading's id
onto it (PART 9 §13, CARVE-P9-019). A `<section>` whose first element child is
a heading is read as that wrapper, and its `id` is the heading's:

```html
<section id="S1" class="ltx_section"><h2 class="t">Intro</h2><p>x</p></section>
<section id="Intro-2"><h2>Intro 2</h2><p>y</p></section>
```

```
{#S1 .t}
## Intro

x

## Intro 2

y
```

- An id equal to the one the renderer derives for the heading is derived and
  does not come back, as the rule below says for every derived attribute.
- Any other id is written on the heading, unless the heading carries an id of
  its own. That one wins, and the section's is reported `attribute-dropped`.
- The renderer writes nothing else on the wrapper, so every other attribute of
  the section is reported `attribute-dropped` and never moved onto the heading.

The section still takes its `element-unwrapped` row. Dropping the id instead
loses an id the author wrote on the heading, and moving a class onto the
heading puts it on an element that never had it. `section-wrapper-id` pins an
authored id, a derived one, a heading with its own id, and a section class.

## The escaping reaches the imported source

Four of the shapes the import meaning sweep found are not import policy at all.
They are PART 11 §2 applied to the source an importer writes, and §2 already
rules them: a character is escaped IF AND ONLY IF omitting the escape would
change the re-parsed AST. They are recorded here because the importer is where
they were found and where a shared fixture can hold them, not because this page
adds a rule.

§2's test names the RE-PARSED source, and that is the operative word: it has to
be evaluated against the source the writer will emit, not against the tree the
writer emits from. The two differ, because a writer normalizes, and the caption
row below is a miss that lives in the gap between them.

A TABLE CELL WHOSE WHOLE PAYLOAD IS A SPAN MARKER. `<td>^</td>` in an ordinary
two-by-two table comes back as `| ^ |`, which re-reads as a rowspan marker: the
cell above it grows `rowspan="2"` and the cell holding the caret is deleted
outright. The escape is `| \^ |`, it renders `<td>^</td>`, and it is a writer
fixed point. The COLSPAN half of the same production is already escaped - the
pinned build writes `| \< |` for `<td>&lt;</td>` - so this is one production
spelled twice with one half missing, rather than an unruled shape. PART 11 §6e
now says why the cell padding does not cover it.

THE SYMBOL SIGIL. `<p>a :rocket: b</p>` comes back as `a :rocket: b`, which
re-parses as a `symbol` node, so under a configured symbol map the text stops
being the text the HTML held. The escape is `a \:rocket: b`. `:` is already in
PART 11 §5's candidate set, and the tag sigil beside it is already hardened -
the pinned build writes `a \#t b` for `<p>a #t b</p>` - so this too is a miss
rather than a question. `tests/corpus-escape` carries the case for the escaper
itself.

A DETACHED CAPTION LINE. An image followed by a paragraph whose text begins
`^ ` comes back as the image line, a blank line, and that text unchanged:

```html
<img src="g.jpg" alt="G">
<p>^ c</p>
```

```
![G](g.jpg)

^ c
```

which re-reads as a CAPTION - the two blocks fuse into a `<figure>` and the
caret is consumed as the marker, so the paragraph the HTML held is gone. The
escape is `\^ c`, it renders the image and the paragraph back, and it is a
writer fixed point in carve-js and carve-php alike. A caption attaches across a
blank line to exactly four targets, and the pinned build hardens the caret
before three of them - a table, a quote and a code block - so this is one
production spelled four times with one half missing, the same shape as the table
cell above. carve-php hardens it before none of the four.

The missing half is worth stating precisely, because it is not "an image". With
no whitespace between the two elements the escape IS written. The difference is
a whitespace-only text node: inter-element whitespace leaves the image in a
paragraph beside a text node holding a space, the escaper reads that tree and
judges the paragraph no caption target, and the writer then DROPS the text node
and writes a bare image line, which is one. That is the gap §2's wording closes
above. The trailing text node is a second finding of its own - no Carve source
spells it, which is why `detached-caption-caret` records the image unwrapped.

That judgement is not the escaper's to derive. Block-image status is a property
of the resolved tree, set by the promotion phase and published as
`paragraph.blockImage` (PART 9R R7, PART 12 §23), so an importer READS the field on
the tree it built rather than working the rule out a third time in a pipeline
with no access to the phase. The escape it writes is unchanged; where the answer
comes from is not.

A BRACKETED SPAN WHOSE TEXT OPENS A NOTE REFERENCE. A semantic span takes the
compact form, and its bracket run plus a caret is a note reference:

```html
<p><abbr title="y">^1</abbr></p>
```

```
[^1]{abbr=y}
```

That re-reads as the note reference `[^1]` followed by a literal attribute
block, so the span is gone and the paragraph renders `[^1]`. The escape is
`[\^1]{abbr=y}`. Only the LABELED half collides - `[^]` is not a note
reference, so `<abbr title="y">^</abbr>` needs no escape and must not get one -
and the fixture carries both halves so that a fix cannot over-escape its way to
green.

`marker-shaped-cell`, `symbol-sigil-escape`, `detached-caption-caret` and
`note-reference-in-a-span` pin the import direction.

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

THE TARGET IS THE CAPTIONED BLOCK, NOT A PARAGRAPH AROUND IT, and on this shape
the round trip is what says so. PART 9 §4b's hosts are "an image, a quote, a
code block, a display-math paragraph": the image host is the image, and only
the math host is a paragraph, which §4b spells out for that one. So the tree is
`figure{target: image}` - the same node the source above parses to - and a
synthesized paragraph wrapper is a different document, rendering
`<figure><p><img></p>` where the input had no `<p>` at all. A `<figure>` whose
body is genuinely prose is the other case and is untouched: a caption line does
not attach to prose (§4's enumeration is closed), so that target stays a
paragraph and the loss is on the writing side (markup-carve/carve#1606).

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

with `structure-unspellable` on the `<figure>`. An image, a quote and a code
block keep their figure and report nothing, because for those three the caption
line re-parses to the figure it was written from.

**A PARAGRAPH TARGET IS NOT A FOURTH SUCH CASE, and reads like one.** A caption
line does not attach to prose (PART 9 §4's enumeration is closed), so the `^ `
line written under a paragraph re-reads as literal text INSIDE it, and the
figure is gone:

```html
<figure id="g"><p>x</p><figcaption>Cap</figcaption></figure>
```

```
{#g}
x
^ Cap
```

which renders back as:

```html
<p id="g">x
^ Cap</p>
```

The caption is not merely lost; it has become prose the document never said. In
`safe` and `semantic` that import is permitted anyway - being lossy is what
those modes are - and the section below is where it is not.

## `roundtrip` rebuilds a figure only when a Carve spelling reproduces it

**In `roundtrip`, rebuild a figure when a Carve spelling reproduces the element,
preserve the element as raw HTML with `raw-preserved` when none does, and never
lose anything silently** (markup-carve/carve#1704).

`semantic` is unaffected. Being lossy is what distinguishes the two modes, and
`roundtrip` is the one whose whole job is fidelity: a mode that turns the figure
above into a paragraph carrying a stray caret line is spending the only thing it
has to offer, and spending it in silence.

THIS IS A PROPERTY AND NOT A LIST OF BLESSED TAG NAMES. An implementation may
answer it with a target table - the set is small and stable - but what a test
pins is the property, so a caption target added later inherits the rule instead
of needing another sweep of every element name to discover it. A name list is
the shape that drifted into the ticket this rule came from: it opened as a
119-tag survey asking which engine's `<figure>` behavior was right, and the
answer turned out not to be about tag names at all - each engine was right on
one side of a predicate neither had written down.

The predicate is one question asked of the whole family, and it points in both
directions:

| shape | rebuild round trips? | `roundtrip` writes |
| --- | --- | --- |
| a figure around an image | yes | the image and a `^ ` line, no diagnostic |
| a figure around a code block | yes | the fence and a `^ ` line, no diagnostic |
| a figure around a quote | yes | the quote and a `^ ` line, no diagnostic |
| a figure around a table | no (see below) | the table and a `^ ` line, with `structure-unspellable` |
| a figure around a list | no | the `<figure>` preserved, with `raw-preserved` |
| a figure around a paragraph | no | the `<figure>` preserved, with `raw-preserved` |
| an orphan `<td>`, `<tr>`, `<thead>` and the rest of the table parts | no | the element preserved, with `raw-preserved` |

An orphan table part is the same predicate pointing the other way, and it is
settled here rather than left to a later sweep: at document top level with no
`<table>` around it, `<td id="x"><h1>H</h1></td>` has no Carve spelling at all,
so rebuilding it as `# H` drops the element and its id. It is degenerate input -
no Carve renderer emits it - and that is why it is stated rather than fixtured.

The rule binds an importer whose parser HANDS THE ELEMENT OVER. Both reference
engines' do, which is why the ticket could measure an `id` surviving into one
engine's output and being dropped by the other's. Where a host parser discards it
instead - HTML5's in-body insertion mode ignores a stray `<td>` outright, and a
fragment parsed in that context never builds the node - there is nothing to
preserve and nothing to report, and this section asks for neither.

**One carve-out, deliberate.** A figure around a TABLE has no spelling that
reproduces it either: as the section above shows, the rebuild writes the caption
on the table and renders `<table id="t"><caption>Cap</caption>`, so strictly this
row would preserve the element. It rebuilds anyway, with the
`structure-unspellable` row it already owes, because `<table><caption>` is the
idiomatic HTML for a captioned table and preserving the element would throw the
`| a |` spelling away for a common shape. This is the one place the rule bends,
it bends on purpose, and it is recorded here so a later sweep reads it as an
exception rather than as a bug.

A `<figure>` carrying no `<figcaption>`, or one whose caption spells nothing,
never reaches this decision. A figure is the CAPTIONED wrapper (PART 9 §4b), so
such an element is not a figure to rebuild or to preserve: it unwraps to its
content with `element-unwrapped`, in every mode, which is the behavior this rule
leaves untouched.

## An HTML comment imports as a Carve comment

The usual reason for dropping an HTML comment - the language has no spelling
for the shape - does not apply: **Carve has comments**
(markup-carve/carve#1709). Dropping one would therefore be a choice to lose
bytes the format can represent, in a mode whose whole job is fidelity.

**An HTML comment imports as a `comment` node, in every mode.** A comment
renders nothing in either language, so this is invisible in the output and
lossless in the source.

The POSITION decides the spelling, and it is not relocated:

| where the comment sits | the node | the source a writer spells it as |
| --- | --- | --- |
| among blocks | a block comment | the `%%%` fence, widened past any fence line inside it |
| inside an inline run | a delimited inline comment | `{% … %}` |

The block form always has a spelling: the fence widens the way a code fence
does, so no payload can close it early. The inline form does not, and where it
does not the comment is DROPPED with one `element-dropped` row saying so.

**Two payloads have no inline spelling**, and both close the comment early
rather than being escapable:

- text containing `%}`, which is the closer;
- text containing a BLANK line, which ends the paragraph the run is in.

**Do not truncate or escape a comment to force it into the inline form.** A
comment that came back shorter, or with characters the author did not write, is
a silent content change; the drop plus its row is the correct answer, and the row
is the point.

**The comment is not relocated to make it spellable.** Moving an inline comment
out to a block comment would put text somewhere the author did not write it, and
`roundtrip` reading its own output would then find the document had moved. Where
only one position can be represented, the other is reported.

**A comment inside an element preserved as raw HTML needs no row.** It is inside
the preserved bytes and reaches the output with them.

**An element that imports to nothing does not make a comment inline.** A run of
loose siblings becomes a paragraph only when something in it survives as inline
content. A dropped element, such as an empty unknown element or a `<noscript>`,
contributes nothing, and a comment whose only other siblings in the run are
such elements and whitespace sits among blocks:

```html
<section><h2>T</h2><!--/lit-part-->
<x-el></x-el>
<p>y</p></section>
```

```
## T

%%%
/lit-part
%%%

y
```

Reading it as an inline comment would build a paragraph holding only that
comment, which renders as an empty `<p>` the HTML never had. The import is the
one the same HTML gives without the dropped element
(markup-carve/carve-rs#2029). `comment-beside-dropped-element` pins it for an
empty unknown element and a `<noscript>`, beside an unknown element with text,
which keeps the comment inline.

## The last newline of a code block is its terminator, not a line

A code block's content is bytes the author wrote, so gaining or losing a line
is a CONTENT change and not a formatting one (markup-carve/carve#1708).

**Strip exactly one newline immediately before `</code>`, or before `</pre>`
where there is no `<code>`. Any further newline is content, and so is any
trailing space or tab on the last line.**

The renderer settles this rather than taste. A Carve renderer writes exactly
one newline before the closing tag for a code block whose content is `x`, and
two for one whose content ends in a blank line:

````
```
x
```
````

```html
<pre><code>x
</code></pre>
```

````
```
x

```
````

```html
<pre><code>x

</code></pre>
```

An importer that strips NO newline reads the first back as content ending in a
blank line, so the document gains a line every time it goes round. One that
strips them ALL reads both back as `x`, so the second loses the line the author
wrote and the two documents arrive indistinguishable. Only removing exactly one
makes the importer the inverse of the renderer, and `roundtrip` on an engine's
OWN output is what that mode is defined by.

The asymmetry mirrors HTML's own at the other end, where a newline immediately
after `<pre>` is stripped and one before `</pre>` is not.

**Nothing is reported**, in any mode. The newline removed was the terminator,
so no content was lost and there is nothing to declare. The correction applies
in `safe` and `semantic` as well; only `roundtrip` can be checked by a round
trip, but the content question is the same in all three.

## A whitespace-only block keeps its content and drops its layout

An element whose text is entirely whitespace is two different documents
depending on ONE question, and the answer is the one the canonical writer
already gives (PART 11 §7): ASCII SPACE and TAB are LAYOUT, and every other
character is CONTENT (markup-carve/carve#1628).

| HTML | Carve | reported |
| --- | --- | --- |
| `<p>&nbsp;</p>` | a paragraph holding U+00A0, written as itself | nothing |
| `<p> </p>` | no node at all | `element-dropped` |
| `<p>&#9;</p>` | no node at all | `element-dropped` |

**THE RULE IS OVER THE CHARACTER CLASS, not over `&nbsp;`.** The dividing line
is the same two-character `whitespace` terminal PART 2 names and nothing else,
so NARROW NO-BREAK SPACE (U+202F) and IDEOGRAPHIC SPACE (U+3000) are kept
exactly as U+00A0 is, and the line terminators an HTML parser folds into
whitespace go with the ASCII pair. An importer that special-cases the `&nbsp;`
entity has implemented a different rule that happens to agree on one row.

What makes the two rows differ is spellability, and it is measurable rather
than a matter of taste. A lone content-space line parses back as a PARAGRAPH:

```
- a


- b
```

(the middle line is a single U+00A0) is three top-level blocks - list,
paragraph, list. A lone ASCII-space line is a BLANK LINE, so the same document
with a space there is two lists and no paragraph at all.

So keeping U+00A0 is not manufacturing a node the language cannot express, and
it is the only answer where

```
parse(htmlToCarve(h)) == htmlToAst(h)
```

holds on the first row with no special case. It holds on the other two rows as
well, and only because the node is never built: a paragraph holding one ASCII
space is unspellable, so it would vanish the moment the writer ran and the two
exits would disagree about the same import.

**Normalizing a content space to an ASCII one is forbidden outright**, which is
the answer this rule removes rather than ranks. It keeps a node while
discarding the single property that distinguishes U+00A0 from a space, and the
paragraph it leaves behind is the unspellable one above - so it fails
`parse(fmt(x)) == parse(x)` on a document the importer built itself.

**The drop is reported and the keep is not.** Dropping a block the input had
is a real loss, so it takes `element-dropped` - a code that already exists, so
no vocabulary grows for this. Keeping a character costs nothing to declare
because nothing is given up: it survives the write intact. A silent drop would
be the one outcome the loss report exists to prevent.

**The spacer argument is real and is not this rule.** Word, CKEditor and
TinyMCE all emit `<p>&nbsp;</p>` as a layout spacer, so a migration may well
want it gone - but that is an OPT-IN on `migrate`, not a silent default that
throws away content the language can spell.

`whitespace-only-block` pins all three rows, plus the two non-ASCII spaces the
class reaches.

## An empty list is dropped

A `<ul>` or `<ol>` with no `<li>` child imports as nothing, with one
`element-dropped` row at `warning` located at the list (markup-carve/carve#2367):

```html
<div class="m"><ul class="vector-menu-content-list"></ul></div><p>after</p>
```

```
::: m

:::

after
```

A list has no spelling without an item. Keeping the list's attributes would
write an attribute line with no block under it, which `carve fmt` removes, so
the import would not be a fixed point of the writer. The row covers the
attributes the list carried, the same way the row for a whitespace-only
paragraph does. Other children of the list are handled as they are for any
list: text, elements and comments move ahead of where the list stood, with
their own rows.

`empty-list` pins an attributed empty list inside a container, a bare empty
list, and an empty list nested in an item.

## An empty paragraph is dropped

A `<p>` whose content imports to nothing, because it is empty or holds only
elements that are dropped, has no spelling: Carve has no empty paragraph. It
imports as nothing. When it carried an attribute, one `element-dropped` row at
`warning`, located at the paragraph and covering those attributes, says so
(markup-carve/carve-php#2526):

```html
<p>a</p><p class="mw-empty-elt" id="x"></p><p>b</p>
```

```
a

b
```

Writing the attributes on a line of their own does not keep them: an attribute
line attaches to the next block, so `{#x .mw-empty-elt}` above `b` moves the id
and the class onto a paragraph that never had them. A bare empty `<p>` loses
nothing and is dropped without a row. Other blocks with no content do have a
spelling and keep their attributes: `<hr id="h">` is `{#h}` above `---`.

`empty-paragraph` pins an attributed empty paragraph, one holding only an empty
`<span>`, and an attributed `<hr>`.

## An empty heading is dropped

A heading with no content imports as nothing, with one `element-dropped` row at
`warning` located at the heading (markup-carve/carve#2419):

```html
<h1></h1><p>a</p><h2 id="k"> </h2><p>b</p>
```

```
a

b
```

Carve spells no empty heading: `inline_content` is one-or-more, so a bare `#`
re-parses as a paragraph holding `#`. Writing the marker anyway is what broke
`parse(htmlToCarve(h)) == htmlToAst(h)` here, with the AST exit returning a
heading and the source exit a paragraph. Dropping the node is what the empty
list and the whitespace-only paragraph already do, and it leaves both exits with
no node.

`<h1> </h1>` is the same drop under `CARVE-P11-017`, which builds no node where
every character a block holds is layout.

The row is owed whether or not the heading carried attributes, because the drop
loses the level as well: a heading is the one empty block whose kind is part of
what it said. A bare empty `<p>` has nothing of the sort and takes no row.

`empty-heading` pins a bare empty heading and an attributed whitespace-only one.

## Adjacent definition lists become one

Carve source has no boundary between two definition lists: a blank line
between two entries separates nothing, and the hard list boundary of PART 9
§11 N1a is a rule about item markers. So a `<dl>` with no attributes of its own
that directly follows another definition list JOINS it, in both exits
(markup-carve/carve#2369):

```html
<dl><dt>a</dt><dd>x</dd></dl><dl><dt>b</dt><dd>y</dd></dl>
```

```
:: a
: x
:: b
: y
```

The joined list takes the entries of both in order, and is loose if either was.
Each merged `<dl>` takes one `element-unwrapped` row at `info`, located at that
`<dl>`: its entries survive and its grouping does not.

A `<dl>` that carries attributes is not merged. Its attribute line stands
between the two lists and keeps them apart, so it is written as its own list.
Anything else that spells a block between the two, a paragraph or a comment,
keeps them apart the same way.

## A figure and its target share one attribute line

An attribute line above a captioned block belongs to the figure the caption
makes (PART 9 §4b), and the parser merges two stacked attribute lines into one
(§15). Only an image has an attribute slot of its own under a caption line, in
the braces after its destination. A quote, a code block, a display-math
paragraph or a table has none, so its attributes and the figure's share the one
line (markup-carve/carve#2370):

```html
<figure id="l" class="listing"><pre class="playground"><code class="language-rust">x</code></pre><figcaption>Cap</figcaption></figure>
```

````
{#l .listing .playground}
```rust
x
```
^ Cap
````

The importer merges them the way the parser would, in both exits: the figure's
attributes first, then the target's, classes in that order, and the target's
value winning an `id` or a key both set. The value that loses is declared with
the `attribute-dropped` row markup-carve/carve#1721 ruled, one per name. Writing
the two as separate lines is not a second spelling of the same thing: the
writer merges them, so that source is not a fixed point of `carve fmt`.

## A comment holding a line break has no spelling in a table cell or a heading

A pipe-table row is one line ([CARVE-P2-019]), so a comment whose
text holds a line break cannot be written inside a cell. It is a third payload
with no inline spelling, beside the two in "An HTML comment imports as a Carve
comment", and it takes the same answer: the comment is dropped with one
`element-dropped` row at `warning`, located at the comment
(markup-carve/carve#2372). Folding the line break into a space would change
the comment's text, which that section forbids.

A comment inside a cell is written inline even where it stands among the
cell's blocks, because the cell flattens them into its one line; a line comment
there would swallow the rest of the row. A comment outside any cell keeps its
line breaks.

A heading is one line too, so a comment holding a line break inside a heading
takes the same answer: it is dropped with one `element-dropped` row at
`warning`, located at the comment (markup-carve/carve#2396).

```html
<h2>a <!-- x
y --> b</h2>
```

```
## a  b
```

## An attribute value holding a pipe is quoted

A table row's cells are cut from the line before inline parsing, and `\|` is
the only pipe the cut leaves in place ([CARVE-P2-019]). So the writer spells an
attribute value holding `|` quoted, with each pipe escaped, and the quoted
value reads the escape back as the pipe (markup-carve/carve#2383):

```html
<table><tr><td id="c" data-x="a|b">t</td><td><span data-y="p|q">u</span></td></tr></table>
```

```
|{#c data-x="a\|b"} t | [u]{data-y="p\|q"} |
```

The rule holds wherever the value sits, inside a row or not, so one spelling
serves every position and `carve fmt` writes the same one.

## An attribute value holding a line break is dropped

A quoted attribute value stops at the line break ([CARVE-P4-006]), so a value
holding one has no Carve spelling. Writing it across two lines leaves an
attribute block that does not reparse, and the blocks after it read
differently. The attribute is dropped with one `attribute-dropped` row at
`warning`, and the element keeps its other attributes
(markup-carve/carve#2385):

```html
<div class="h" data-copy="a
b"><pre><code>x</code></pre></div>
```

````
::: h
```
x
```
:::
````

## A description before the first term is written as blocks

A definition line with no term before it re-reads as a paragraph, so a `<dd>`
before a `<dl>`'s first `<dt>` has no Carve spelling. Its content is written as
ordinary blocks ahead of the list, in both exits, with one `element-unwrapped`
row at `warning`, located at the `<dd>` (markup-carve/carve#2384). A `<dl>` left
with no entry writes no list, and each attribute it carried takes an
`attribute-dropped` row at `warning`:

```html
<dl class="k"><dd><div id="p" class="noprint"><i>x</i></div></dd></dl><dl><dd>a</dd><dt>t</dt><dd>d</dd></dl>
```

```
{#p}
::: noprint
/x/
:::

a

:: t
: d
```

The blocks between the two lists keep them apart, so the second list is not
merged into anything.

## A table whose cells hold blocks can be written as a list table

A pipe-table cell is one line of inline content, so a cell holding two
paragraphs, a list or a code block is flattened to its text. ListTable
(extension contract §5) is the construct for that case: its cells are list
items and hold full block content. The `listTableForBlockCells` option writes
such a table as a `::: list-table` instead (markup-carve/carve#2391).

THE OPTION IS OFF BY DEFAULT, and has to be. Pipe tables are core and always
on, while ListTable is Tier-2 and off until a processor enables it, so a
consumer that has not enabled it renders a `<div class="list-table">` around a
nested list, which is worse than the flattened table. The caller knows which
processor reads the output; the importer does not. The option is spelled
`listTableForBlockCells` in the JavaScript options and the PHP constructor,
`list_table_for_block_cells` on the Rust `HtmlImportOptions`, and
`--list-table` on `carve migrate --from html`. It is accepted in every mode and
under every adapter.

ONLY A TABLE THAT NEEDS IT SWITCHES. A `<table>` is written as a list table
when at least one of its cells is BLOCK-BEARING: the cell has a descendant
`ul`, `ol`, `pre`, `blockquote`, `table` or `dl`, or more than one `p`
descendant. Only the cells of the table's own rows count; a table nested in a
cell decides for itself by the same test. Every other table keeps the pipe
form, so turning the option on does not rewrite a table whose cells are all
inline.

THE GRID IS THE PIPE FORM'S. The list table has the rows and cell positions
the import builds for the same table with the option off: the same rows, the
same span resolution, and a continuation placeholder in each position the pipe
form puts one. A row whose cells are all empty stays, as a row of empty items:
the pipe form drops it because Carve reads such a row as text, and a list table
has no such reading. A row with no cells at all is dropped with a
`structure-unspellable` row at `warning`, because a list-table row is the list
of its cells and an empty one is not a row ListTable reads. Each row is an outer item and each position an inner item, left
to right. A rowspan placeholder is the item `^`, a colspan placeholder the item
`<`.

A CELL IS A LIST ITEM. Its content imports under the ordinary block rules, as
the content of an `<li>` does, so its paragraphs, lists, code blocks, nested
tables and hard breaks keep their own spelling. A cell with no content is an
empty item. A cell whose whole content is a lone `^` or `<` is written escaped
(`\^`, `\<`), because the bare item is a span marker (§5.1) and the cell would
turn into a span. The outer list is tight; a row's inner list is tight unless
one of its cells holds more than one block, and both are written in the
canonical form, so the output is a `carve fmt` fixed point.

HEADERS ARE COUNTED OVER THE GRID, a placeholder counting as the cell it
continues.

- `header-rows=N`, where N is the number of leading rows whose cells are all
  header cells: the rows the pipe form writes as its header.
- `header-cols=M`, where M is the fewest leading header cells of any row below
  those.
- `{header}` on the item of any other header cell, which neither count covers.

Each count is written only when it is not zero, so no `<th>` becomes a data
cell.

ATTRIBUTES GO WHERE LISTTABLE HAS A SLOT FOR THEM.

- The table's own attributes stay on the attribute line, followed by
  `header-rows` and `header-cols`.
- The table's caption is the opener's quoted title, with the inline content the
  pipe form's caption line would hold.
- A cell's attributes, the ones the pipe form keeps on the cell, go on its item,
  followed by `{header}` where it applies and then by the cell's own
  alignment as `align=` and `valign=` where it has one. A cell keeps its own
  alignment even where the pipe form leaves it to the column.
- A row's attributes have no slot: an outer item carries no attributes a
  ListTable renderer reads. They are dropped with an `attribute-dropped` row at
  `info`, located at the `<tr>`.

THE REPORT SAYS WHAT THE LIST TABLE LOSES. A switched table does not report the
pipe form's flattening (the `element-unwrapped` row for a block in a cell, the
`structure-unspellable` row for a `<br>` in a cell, the `element-dropped` row
for a comment holding a line break), since nothing is flattened, and it does
not report `rowspan` or `colspan` as dropped, since the placeholders spell
them. It reports the row attributes above, what a cell's blocks lose exactly as
the same blocks report anywhere else, and whatever the option-off import
reports about the table as a whole: a second caption, a `<colgroup>`, the row
grouping and section attributes, and a rowspan clipped at the header rows. Both
exits report the row grouping, because the list table has no slot for it on
either one.

```html
<table>
<caption>Steps</caption>
<tr><th>Step</th><th>Detail</th></tr>
<tr><th>1</th><td><p>Install.</p><pre><code>npm i</code></pre></td></tr>
<tr><td colspan="2">^</td></tr>
</table>
```

````
{header-rows=1}
::: list-table "Steps"
- - Step
  - Detail
- -{header} 1

  - Install.

    ```
    npm i
    ```
- - \^
  - <
:::
````

The second row's first cell is a `<th>` below the header rows, and the third
row starts with a data cell, so no column is a header column and that `<th>`
carries `{header}`. The `^` in the third row is the cell's text, so it is
escaped, and the `<` after it is the placeholder of the `colspan`.

## A link's edge whitespace stands outside it

A link or a span whose content begins or ends with whitespace imports with that
whitespace moved outside the construct (markup-carve/carve#2361):

```html
<p>Source: <a href="https://jma.go.jp/"> Japan Meteorological Agency </a>.</p>
```

```
Source: [Japan Meteorological Agency](https://jma.go.jp/) .
```

The words are the label and the spaces are layout. A browser underlines them,
and that underline is the only thing the move changes. Writing them into the
label gives `[ Japan Meteorological Agency ]`, which no author writes and no
other converter produces.

The rule, after HTML whitespace collapse:

- Leading whitespace of a `link` or `span` node leaves the node and stands
  before it; trailing whitespace stands after it. Whitespace is the same ASCII
  class the collapse folds, so U+00A0 and every other content space stays
  inside.
- The moved whitespace is ONE space, and it merges with whitespace already on
  that side: `a <a> x</a>` is `a [x](...)`, not `a  [x](...)`. The neighbor is
  read through nested inlines, so `<b>x </b><a> y</a>` is `{*x *}[y](...)`
  with no second space. At a block's edge the moved space is dropped like any
  other edge whitespace, so `<p><a> x</a></p>` is `[x](...)`.
- The whitespace stays OUTSIDE rather than disappearing, so the words on either
  side do not merge: `x<a> y</a>` is `x [y](...)`.
- It applies innermost first, so it passes out through a nested link or span.
  Formatting nested inside that link or span participates in the same pass
  (markup-carve/carve#2376): `<p>a <a href="/s"><b> x </b></a> b</p>`
  imports as `a [*x*](/s) b`. The strong's spaces first move into the link,
  then outside it. This covers strong, emphasis, underline, strike, highlight,
  insertion, deletion, superscript, and subscript. Code, math, and images stop
  the pass and keep their content. Formatting outside a link or span retains
  an edge space only when it separates content from a neighbor
  (markup-carve/carve-php#2079).
- Content that is whitespace only stays as it is (`[ ](/w)`). Moving it out
  would leave an empty label, a different shape from the one the HTML has.
- An image at the edge of a link stays inside it; only the whitespace around
  it moves. An image's `alt` is not content and is not trimmed.

No diagnostic. No character is lost and the document means what the HTML
meant, the same as the whitespace HTML discards at a block's edge.

`link-edge-whitespace` pins each row above, including the nested strong.

Formatting around a link follows the same separator rule
(markup-carve/carve#2427). Padding at a block edge is dropped. An inner edge
space that duplicates a space outside the formatting is merged with that
outside space. When the inner space is the only separator, it stays inside.

| HTML | Carve |
| --- | --- |
| `<p><strong> <a href="/x">mk</a> </strong></p>` | `*[mk](/x)*` |
| `<p>a <strong> <a href="/x">mk</a> </strong> b</p>` | `a *[mk](/x)* b` |
| `<p>a<strong> <a href="/x">mk</a> </strong>b</p>` | `a{* [mk](/x) *}b` |

Each edge is checked separately, including through nested formatting.
Whitespace-only formatting, code content, and nonbreaking spaces stay intact.
A directly adjacent hard break counts as a separator; a break inside preceding
formatting does not.
`formatting-around-link` pins these rows, both asymmetric cases, nested
formatting, code content, whitespace-only formatting, nonbreaking spaces, and
direct and nested hard breaks.

## MathML imports the TeX it carries, or the text it shows

A `<math>` element imports through the first of these that applies
(markup-carve/carve#2361, extending the D6 ruling on markup-carve/carve#1210):

1. An `<annotation>` that is a direct child of the element's own `<semantics>`
   and whose `encoding` is `application/x-tex`, `text/x-tex` or `LaTeX`
   (case-insensitive, the whole value). Its text is the `math` node's content,
   byte for byte.
2. The `alttext` attribute, with `encoding-assumed` at `info`: MathML does not
   declare what `alttext` holds.
3. The `alt` of the formula's FALLBACK IMAGE, with `encoding-assumed` at
   `info`, and only where the page HID the MathML: the `<math>`, or the
   `<span>` holding nothing but it, carries a `style` whose effective
   `display` is `none` (the last `display` declaration, an `!important` one
   before any that is not). The fallback image is an `<img>` that is the next element sibling of
   the `<math>`, or of a `<span>` holding nothing but it, with only whitespace
   text or comments between. Adjacency alone is not evidence: a portrait beside
   a visible formula is a portrait, and reading its `alt` as TeX would replace
   the formula and drop the picture.
4. The formula's TEXT, as plain text rather than a `math` node, with
   `element-unwrapped` at `warning`. Only when the presentation is LINEAR: the
   element holds nothing but `mrow`, `mstyle`, `mpadded` and `mspace` around
   the tokens `mi`, `mn`, `mo` and `mtext`, and a `<semantics>` is read through
   its first child only. The text is each token's text in order, with the
   token's own whitespace collapsed and trimmed. Whitespace between elements
   contributes nothing, and neither does an `mspace`, except that one space
   stands where an `mspace` separates a letter or digit from the next one, so
   `<mn>1</mn><mspace/><mn>2</mn>` reads `1 2` and not `12`. `mathvariant` is
   not applied.
5. Nothing: the element is dropped with `element-dropped` at `warning`. In
   `roundtrip` the element is kept as raw HTML instead of tiers 4 and 5.

A trimmed empty value at any tier falls through to the next.

```html
<p>A <math><mi>a</mi><mo>+</mo><mi>a</mi><mo>=</mo><mn>2</mn><mi>a</mi></math> B</p>
```

```
A a+a=2a B
```

**TIER 4 IS TEXT BECAUSE IT IS NOT TeX.** A `math` node claims TeX content, and
`a+a=2a` only happens to be valid TeX; `∀x∈X` is not the TeX anyone would
write. The characters are what the formula shows, so they arrive as what they
are.

**TIER 4 STOPS AT LAYOUT, which is what D6 ruled.** Flattening a fraction or a
script is not a degraded formula but a different value:
`<mfrac><mn>1</mn><mn>2</mn></mfrac>` reads `12`, and a plausible wrong value
survives review where a warning naming a dropped element does not. A linear
token run cannot change value that way, because reading it in order is what
the renderer does. Any element outside the list, including `mfrac`, `msup`,
`msub`, `msqrt`, `mtable` and `mphantom`, keeps the drop.

**A FORMULA IMPORTS ONCE.** Wikimedia pages spell a formula as a hidden
`<math>` beside a fallback `<img>` whose `alt` is the TeX. Reading both writes
the formula twice. So when the formula imports as a `math` node whose content
equals the fallback image's trimmed `alt`, the image is dropped with
`element-dropped` at `info`. An image whose `alt` says something else is a
different image and is kept.

`mathml-without-tex` pins tier 4 inline, in its own paragraph, as a display
element read through `<semantics>`, an `mspace` between two numbers, and the
fraction that tier 4 refuses.
`mathml-fallback-image` pins the Wikimedia shape with an annotation, tier 3
through a hidden `<span>` wrapper, a following image whose `alt` is not the
formula, and an image beside a visible formula, which stays.

## A declared loss is a ceiling, not a licence

A diagnostic states what the import gave up. It does not license giving up more
than it names. An importer may lose what it declares AND NO MORE - so a source
that damages a neighboring construct on the way to the declared loss is wrong
even though the row is present and accurate about its own subject
(markup-carve/carve#1608).

An empty `<dd>` imports exactly, because Carve spells it:

```html
<dl><dt>term</dt><dd></dd></dl>
```

is written

```
:: term
: {empty}
```

which re-parses to a `definition_description` with no children - the tree the
import built - so nothing is lost and no diagnostic is owed
(markup-carve/carve#1827, PART 11 §7d). `{empty}` is the sentinel PART 11 §7b
uses for an empty footnote definition body; it is an attribute block, and PART 9
§15 A4 drops a block-attribute line with no following block inside its own
container, so it reaches neither the `<dd>` nor anything after it.

**Two other spellings reach an empty `<dd>` and the import uses neither.**

`: %%` renders an empty `<dd>`, but its `definition_description` carries a
`comment` child the source does not have, and this section's own rule permits no
additions.

`: +` is the first-block form (PART 9 §17 L4) with nothing flush-left under it.
It attaches a following column-0 block - `:: term` / `: +` / `text` is a
description whose body is `text` - so it spells an empty body only when a blank
line follows it. The sentinel claims no line below it at any column.

**Nothing that is not an attribute block spells it.** A description marker takes
a separator space and non-empty content (PART 2, MARKER REQUIRES CONTENT), so a
`:` line carrying nothing but whitespace opens no description at all - one space,
several, a tab and a bare colon alike. The line folds into the term above, so the
re-render is

```html
<dl>
  <dt>term
:</dt>
</dl>
```

with the `<dt>` damaged as well as the `<dd>` lost. `: {}` reaches a `<dd>`, but
it holds the literal text `{}`. That is the same rule that makes `[^f]: {empty}`
spell an empty footnote body where `[^f]: {}` does not (PART 11 §7b).

**A looseness key says nothing here.** The one-item and one-block `<dd>` shapes
above take `{loose}`, because what they need is a way to spell a tightness a
blank line cannot reach (markup-carve/carve#1607, markup-carve/carve#1612). An
empty description has no blocks at all, so there is nothing for such a key to say
about it.

### An empty entry that is not the last one

An empty description with an entry AFTER it imports as one list, the same way it
does as the last entry:

```html
<dl><dt>t1</dt><dd></dd><dt>t2</dt><dd>d2</dd></dl>
```

is written

```
:: t1
: {empty}
:: t2
: d2
```

`t1` keeps its own empty description and `t2` keeps exactly `d2`. The sentinel
takes no blank line after it and needs none: it claims no following line at any
column, so the next `::` opens the next entry.

**This is the shape that makes the addition half of the rule concrete**
(markup-carve/carve#1636). Consecutive `::` lines SHARE the description written
below them - that is the `<dl>` model the syntax mirrors - so an import that drops
the empty description and writes both terms into one list gives `t1` the
description `d2`, which it never had.

**An ADDITION is not a loss, and no row can declare it.** A loss that stays
inside a declared ceiling is acceptable because the reader is told what is
missing; an addition changes what the surviving term MEANS rather than what it
fails to say, and a reader who is told the empty description was dropped has
been told nothing about `t1` acquiring `d2`. So the ceiling binds in both
directions: an importer may lose what it declares AND NO MORE, and it may add
nothing at all.

`empty-definition-description-not-last` pins the shape. The one-entry fixture
cannot see it - both readings of a dropped LAST entry write the same source.

## An endnotes section keeps the position it was written at

A `role="doc-endnotes"` section's POSITION is meaning, and an import keeps it.
Carve spells the position with `::: footnotes`, so a section that is not the
last thing in the document imports as that directive WHERE THE SECTION SAT
(markup-carve/carve#1608).

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes"><ol><li id="fn1"><p>n</p></li></ol></section>
<p>after</p>
```

```
a[^1]

::: footnotes

:::

after

[^1]: n
```

Definitions are collected to document level whatever the source says, which is
why the definition itself is written last; the directive is what puts the
RENDERED section back where the HTML had it, and that source renders the input
in the input's order.

This is not `structure-unspellable` and there is nothing to report. That code is
for a structure Carve source has no spelling for, and here the language has one.
Treating placement as a rendering artifact would be defensible only if Carve
could not say otherwise, and it can, so discarding a position the language can
express is a loss with no justification behind it. Corpus document
`122-footnotes-placement` is authored with the directive, so the shape is not a
bridge-only corner.

Where the section IS last, the directive is not written: the definitions already
render there, and adding it would put a construct in the source that the input
did not distinguish.

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

The class the fence word consumes must be one a fence opener can spell, which
PART 9's `admonition_open` resolves through `admonition_type` to
`explicit_identifier`. A digit-leading class is inside that shape, so
`<div class="2col">` comes back as `::: 2col`.

A class OUTSIDE it keeps the generic `div` node, and its class is written as a
KEY-VALUE attribute rather than with the `.` shorthand. PART 4's
`class_attribute` reads the same `explicit_identifier` the fence word does, so
the shorthand is no fallback; `attribute_value` reaches further, and the value
is quoted only where `unquoted_value` cannot hold it. Nothing is lost, so
nothing is reported.

```html
<div class="-col"><p>y</p></div>
```

```
{class=-col}
:::
y
:::
```

Both exits publish the same slot: `class` as a key-value is a spelling of the
class slot ([CARVE-P4-007]), so that source parses to `classes` too, which is
what the import's tree already says. A parser still reading it as a `keyValues`
entry disagrees with the tree beside it (markup-carve/carve#2438), so the fixture
lands with the engine pin that folds it.

**A `<div>` that carries nothing only a container can hold is UNWRAPPED to its
content, and no `:::` fence is written** (markup-carve/carve#1578,
markup-carve/carve-rs#1315). Such a `<div>` carries nothing the container is
needed for, so the fence would cost a reader two lines of markup and tell them
nothing. The element not surviving the round trip is the correct outcome, because
there is nothing in it to survive, and nothing is diagnosed: a diagnostic
announces a loss, and nothing lost its carrier here.

WHAT ONLY A CONTAINER CAN HOLD IS THE WHOLE BOUNDARY, and it is the boundary
rather than the tag. Today it means two things - an attribute the language can
hold, or a grouping label - and the moment a div carries either, the fence comes
back. markup-carve/carve#1578 wrote the test as the attribute, which was a proxy
for that principle and turned out narrower than the principle it stood in for: a
grouping label has no spelling anywhere but on an opener, so it is exactly as
much "only a container can hold it" as an attribute is.

Nor was the narrow reading a loss that could be declared instead. `::: [g]`
renders to a `<div>` with no attribute and a `<p class="div-label">`, and under
the attribute test it came back as a `{.div-label}` PARAGRAPH: the container was
gone and the label had become body content. That is an ADDITION, and this page's
diagnostics announce losses - so "keep the attribute test and declare it"
collapses into dropping the label outright, which throws away content the author
wrote on every round trip.

THE TEST IS WHAT THE ELEMENT KEPT, not what its markup looked like. A `style`
whose declarations the CSS policy above refuses leaves the div carrying nothing,
so it unwraps like any other bare `<div>` and the refusal is still reported as
`style-unmapped`. A label paragraph the LIFT REFUSES is likewise nothing kept,
and without that half the widened boundary would read as "any
`<p class="div-label">` resurrects the fence" and put a fence around a document
that never had a label. The lift refuses four shapes:

- one holding markup, because the label is raw text on the opener and
  flattening it would lose the markup without a word;
- one whose text holds `]` or a line break, because every reader of that run
  takes it up to the first `]` with no balance and no escape, so writing it back
  would take the opener line with it;
- one that is not the container's FIRST ELEMENT;
- one with visible text ahead of it, because lifting it onto the opener would
  move it in front of that text - the reorder the first-element rule exists to
  prevent, arriving by the one route an element search cannot see. Whitespace
  between tags is not text an author wrote, so a pretty-printed container still
  lifts.

Anything the label paragraph carried besides its `div-label` class has no slot
on an opener and is reported as `attribute-dropped`.

A class naming a container is answered earlier by the family above and never
reaches this rule. `attribute-less-div` pins the attribute half of the boundary
and `container-label-keeps-the-fence` pins the label half, including a label the
lift refuses.

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

A CODE SPAN IS NOT ONE OF THOSE SLOTS. Its value is verbatim text rather than
inline content, so blocks flattened into a `<code>` join with NO separator: a
space there would be a byte the author never wrote, and this page permits no
additions. The boundary is reported instead, as `structure-unspellable` located
at the `<code>` whose slot could not hold it (markup-carve/carve#2441):

```html
<code><div>foo</div><div>bar</div></code>
```

```
`foobar`
```

The two `element-unwrapped` rows say what was unwrapped and not what the
unwrapping joined, so the boundary needs a row of its own. The empty delimited
comment that holds the two spans of `adjacent-code-spans` apart is no help
inside one, because it would put comment syntax into a code span's source.

A character that was TEXT and turns into a live delimiter once its neighbor
arrives beside it is a different question, already answered by the writer's
escaping rule: `<p>a *b</p><p>c* d</p>` flattens to `a \*b c\* d`, with the
asterisks escaped because the writer reads its own output.

A `<details>` element's `<summary>` is one of those slots: it becomes the
container's title, so a `<summary>` holding blocks flattens into one line.

```html
<details><summary><div class="t">Baseline</div><div class="s">Wide</div></summary><p>b</p></details>
```

```
::: details "Baseline Wide"
b
:::
```

Each element the flatten unwraps reports `element-unwrapped`, and an attribute
left with no carrier reports `attribute-dropped`. The blocks do not move into
the body instead: summary content is what a reader sees while the disclosure is
closed, so moving it changes what the document means
(markup-carve/carve#2428).

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

### The one-item and one-block shapes take `{loose}`

A blank line needs two things to stand between, so two loose shapes had no Carve
spelling at all until PART 9 section 17 L7 gave them the consumed `{loose}`
boolean. Both arrive from ordinary HTML - `<li><p>...</p></li>` is what
WordPress, TinyMCE and Google Docs export emit - so the importer meets them on
routine input rather than on a corner case, which is why they earned syntax
instead of a `structure-unspellable` diagnostic.

```html
<ul><li><p>only</p></li></ul>
```

```
{loose}
- only
```

```html
<dl><dt>Term</dt><dd><p>Definition.</p></dd></dl>
```

```
{loose}
:: Term
: Definition.
```

The definition list is the worse case: a blank line between two **entries** does
not loosen a `<dl>` in Carve at all, so a `<dd>` holding one paragraph was
unspellable at every entry count, not only at one.

The importer writes the key **only where the blank-line spelling cannot express
the looseness** - a multi-item loose list keeps the blank lines and takes no
attribute line - which is the same rule the canonical writer follows.

The `derived-endnotes-section` fixture is where this is recorded, and it is the
shape that raised the question: a document with a single footnote imports as a
one-item `<li><p>...</p></li>` list, which is exactly the case a blank line
cannot reach (markup-carve/carve#1607). Its source carries the key, its tree
carries no attribute for it - the key is consumed - and the two exits therefore
say the same thing with no carve-out left to justify.

## A derived attribute does not come back

An importer **drops an attribute whose value equals what the renderer derives
for that element, and keeps every other one** (PART 9 §16a). It is the rule a
`<th>`'s generated `scope` and a generated `colspan`/`rowspan` already follow,
and it reaches every accessible name PART 9 §16a and
[extension contract §1.5](./extension-contract#_1-5-the-strings-an-extension-writes-itself)
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

**A consumed attribute is not a dropped one.** A task item's `data-task-state`
(PART 10 §11) is written by the renderer, so the equality test above would call
it derived and drop it - and the state would be gone, because the box it sits
beside renders the same for all five unchecked spellings. The importer READS it
instead, the way it already reads the checkbox `<input>` rather than keeping it
as content: both are halves of the item's state. A value outside the enumeration
is not a state, and the item takes the box it carries.

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
  HTML. It is not safe for untrusted input. What "unsupported" means for a
  captioned wrapper is a property rather than a tag list, and it is stated under
  ["`roundtrip` rebuilds a figure only when a Carve spelling reproduces it"](#roundtrip-rebuilds-a-figure-only-when-a-carve-spelling-reproduces-it).

All modes remove `script`, `style`, `template`, `noscript`, event-handler
attributes, and destinations with a denied scheme, with one exception: inside
an element `roundtrip` keeps as raw HTML, the bytes stay whole and each refused
attribute is reported as `attribute-preserved` instead (carve#2261).
`roundtrip` may recover source embedded by a Carve renderer, but must never
execute it.

## A refused declaration in `style` is a refused attribute

An importer reads `style` through the same refusal policy as every other
attribute. Inside an element `roundtrip` keeps as raw HTML, a `style` is
reported as `attribute-preserved` and never as `style-unmapped`, which names a
mapping kept bytes do not run: at `error` where a declaration carries a denied
URL scheme in `url(...)` or a construct the CSS sanitizer refuses such as
`expression(...)`, and at `info` otherwise. A refused declaration's message is
`Preserved style with a denied URL scheme in a declaration value on <form>` or
`Preserved style with a construct the CSS sanitizer refuses on <form>`, the
element's own tag substituted (carve#2267).

## A preserved attribute row says it one way

An `attribute-preserved` message is
`Preserved <subject> on <tag> <place><reason>`.
`<tag>` is the element the attribute is written on. `<place>`
is `in the raw HTML this element is kept as` where that element is the one kept
whole, and `inside the raw HTML <kept> is kept as` where an ancestor is, with
its tag. `<reason>` is empty, or `: ` and why the attribute was refused.
`<subject>` is the attribute's own name, with the kind of attribute it is before
the name and the word `attribute` between the two, or with what makes it refused
after the name; a subject that is the word `attribute` and a name, with no kind
in front of it, is neither form (carve#2279). The strings the clause above pins
are this template's head, so a row that carries `<place>` after them spells that
clause's message. The same subject spells an `attribute-dropped` row, which has
no `<place>`: `Dropped <subject> on <tag><reason>`.

```
Preserved event-handler attribute onclick on <form> in the raw HTML this element is kept as
```

## Which attributes owe a preserved row

A kept element owes one `attribute-preserved` row per attribute the importer
would have refused had it rewritten the element, plus any whose value the
renderer blanks for a denied scheme. Whether the rewriting path would have
refused it is the whole test, so an attribute that path consumes as an
instruction rather than writing back, or whose key one of the writer's own
markers owns, is refused inside kept bytes, where neither the instruction nor the
marker runs. An attribute that path keeps and the renderer only hardens - a
URL-list attribute under [`CARVE-P9-055`](/rules/imports-security-extensions) - is
not refused, and owes a row only where a token in its value carries a denied
scheme (carve#2279).

```
Preserved round-trip marker attribute data-carve-src on <form> in the raw HTML this element is kept as
```

## A lost checkbox on an ordered task item says it one way

A checkbox the source format reads on an ordered list item survives as the
item's bracket text, and the `structure-unspellable` row reporting it carries
one message at every entry point:

```
An ordered task item is not spellable as a Carve task item; the checkbox marker was kept as text
```

The rule behind the loss is not in the row. `task_marker` hangs off
`unordered_item` alone in `resources/spec/03-blocks-core.ebnf`, so no Carve
source spells a box on an ordered item: the item keeps the characters the box
was read from, in the position the box stood, and loses the task-item semantics.
A row says what happened to this document, and a reader meeting the loss for the
first time can find the reason here rather than in every row that hits it
(carve-js#2062).

The same loss with the same cause reads the same from either direction, so a
consumer filtering on the message does not have to know which importer ran.
The row's `path` still differs, because an HTML importer locates the `<input>`
it read and a Markdown importer has no element to locate. Its remaining fields
are fixed in [format bridges](./format-bridges#a-bridge-reports-it-never-guesses):
`dropped` fidelity at `exact` confidence, beside `fidelity-unverified` where the
entry point emits one.

A position the source format reads no checkbox at owes no row. `> - [ ] a`,
`- - [ ] a` and `1. - [ ] a` keep their bracket pair as text in the source
format too, so nothing was lost there, and reporting a loss that did not happen
is the same defect as staying silent about one that did (carve-js#2047).

## Result and diagnostics

Import APIs return both the document and an ordered diagnostic list. Every
lossy decision should be observable. The common diagnostic codes are:

- `element-dropped`: an element and its contents were removed.
- `element-unwrapped`: an unsupported element was replaced by its children.
- `attribute-dropped`: an attribute was not represented.
- `attribute-preserved`: an attribute the importer would not represent as a
  Carve attribute reached the output anyway, inside the bytes of an element
  kept whole under `raw-preserved`. Nothing was lost, so it is NOT
  `attribute-dropped`: a consumer that filters on the code rather than reading
  the prose would be told a drop happened that did not. An importer that
  preserves an element as raw HTML MUST report under this code the refused
  attributes of that element AND of every element inside it, because all of
  them are in the kept bytes (carve#2261). The order is the element's own
  rows, its `raw-preserved` row, then each descendant's rows in document
  order. Its severity MUST be `error` where the attribute is one a renderer refuses for safety - an event handler, an
  injection sink, a value carrying a denied URL scheme - and `info` otherwise.
  The `error` is not a failed import; it is the strongest thing the report can
  say, and this row earns it because `roundtrip` is the mode that is not safe
  for untrusted input and this is the row saying such an attribute is LIVE in
  the output. A dropped handler already spends `warning`, so spending `warning`
  here too would tell a filter nothing about which of the two it is looking at.
- `style-unmapped`: CSS had no explicit semantic mapping.
- `table-degraded`: a table could not be represented structurally.
- `raw-preserved`: unsupported trusted markup was retained as opaque raw HTML.
  Its bytes survive, but structured editing is unavailable, so migration
  fidelity is `degraded` rather than `preserved`.
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
- `diagnostics-truncated`: the diagnostic cap was reached. Because omitted
  findings may include irreversible loss, its fidelity is `dropped` with
  `fallback` confidence.

**Every code here has a producer.** A code the format names and nothing can emit
is a promise to a consumer that no import will keep, and `structure-split` was
one for as long as the shape that produced it existed: a dropped empty `<dd>`
split a `<dl>` in two until that entry gained the `{empty}` sentinel, after
which no engine could emit the code and the taxonomy still named it. The
fixtures gate this in both directions, with one exemption - `diagnostics-truncated`
reports the state of the report rather than a loss at a place, and no fixture
reaches a cap.

Retiring a code is not a compatibility event and adding one back is not either:
a reader must already tolerate a code it does not know, so the list may grow the
day a shape needs it.

`encoding-assumed` is deliberately not filed under `element-unwrapped`.
Unwrapping is a note about the input's structure and loses no meaning;
an assumed encoding is a warning about the output. A consumer told only that an
element is gone cannot tell a harmless structural event from content that may
be in the wrong language entirely, and that is the one signal it could act on.

Diagnostics have `code`, `message`, `severity` (`info`, `warning`, or `error`),
and optional `path`, `line`, and `column`.

## The order of the diagnostic list

A diagnostic list MUST be ordered by the document position of the LOSING
ELEMENT (carve#1586). The losing element is the one the diagnostic is about:
the element that was dropped or unwrapped, the element the attribute was
written on, the element whose structure could not be spelled. Where two
diagnostics name the same element - two attributes on one tag - they follow the
order that element spells them.

The basis is stated because "ordered" on its own is not a rule. This page said
the list is ordered for as long as it has existed and never said ordered by
what, so each implementation answered with whatever order its own walk produced,
and two of the three disagreed with the third on a `<table>` losing something on
both its `<caption>` and a cell.

TWO THINGS THE BASIS IS NOT, and both of them coincide with it in some
implementations:

- It is NOT the position at which the diagnostic was CONSTRUCTED. An importer
  that lifts footnote definitions out of the end of a document and imports them
  before the body builds those rows first; they belong last, where the author
  wrote the notes.
- It is NOT the traversal order of whatever shape the importer reads the parent
  through. An importer that fills a table's caption slot on the finished table
  reads the cells first; the caption still comes first if that is where it
  stands in the source.

An element the HTML parser IMPLIED - a `<tbody>` around rows nobody wrote one
for - is not in the source and has no position of its own. It takes the
position of the nearest ancestor that has one, and ties with it.

`diagnostics-truncated` is last. It reports the state of the report rather than
a loss at a place, so it has no element to be ordered by.

HOW MANY ROWS ONE LOSS TAKES IS ENGINE-DEFINED (carve#1884). The order above is
normative; the GRANULARITY is not. A table whose `<thead>` sits between two
`<tbody>` runs loses its row grouping, and an importer may say so in one row or
in one row per distinct loss:

```
Dropped the row grouping of a table whose <thead> or <tfoot> is not at the edge
of its rows
```

```
Merged 2 <tbody> groups into one; Carve source has no body grouping
The table head changes from 1 to 0 row(s); Carve derives it from the leading run
of header rows
```

Both are the same code at the same place and neither is more true. Coalescing
loses detail a reader might want; itemizing spends rows on one element. Nothing
downstream can act on the difference, because a consumer filters on the CODE and
reads the prose - which is the same reason `path` is engine-defined a section
below.

WHAT A SHARED FIXTURE MAY PIN, THEREFORE. Its `diagnostics` are the rows an
implementation MUST produce, in order: the fixture's sequence must appear in the
report as a subsequence, and every row the report adds must carry a code the
fixture already names.

AND A ROW SUBJECT TO THAT STATES NO `message`. The wording follows the
granularity - "dropped the row grouping" and "merged 2 `<tbody>` groups into one"
describe the same loss at different sizes - so a fixture that pinned the message
would pin the granularity through the back door. Such a row states its `code`,
and its `severity` and `path` where those agree; the prose is the engine's. Every
other row states its message as before, and the check on those is unchanged:
an unpinned message is how a reworded or emptied one used to pass unnoticed. An implementation may split one of those rows into
several; it may not invent a code the fixture does not list, drop one it does,
or reorder them. That is what makes a fixture portable rather than a recording
of whichever engine its author generated it from.

WHY THIS IS A REQUIREMENT RATHER THAN A QUALITY OF IMPLEMENTATION. The shared
fixture runners compare diagnostics POSITIONALLY. With no defined order, a
fixture holding more than one diagnostic was safe only where the implementations
happened to agree anyway - which they do when the losses sit in separate
top-level blocks, and did not when two sit under one parent. Such a fixture
would pin whichever order its author's engine produced, and that is why
`table-caption-index` had to be kept to a single row (carve#1560). The runners
stay ORDERED for the same reason - comparing unordered would state a rule that
nothing enforces - and they match the fixture's rows as a SUBSEQUENCE rather
than element for element, which is what the granularity rule above requires of
them. Order is still the check; count is not. The `diagnostic-order` fixture is the case this
opens - two losses in one `<table>`, in the order the document spells them.

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

A table `<caption>` is where the forbidden reading is hardest to see, because a
table has at most one, so "among the captions" can only ever be `[1]`. There is
nothing there to renumber, and a step that prints `[1]` unconditionally is not
applying a different basis but no basis at all.

```html
<table>
<caption onclick="x()">c</caption>
<tr><td>a</td></tr>
</table>
```

```
/table[1]/caption[2]
```

The caption is the SECOND child: the newline after `<table>` is the first.
Written on one line the same caption is `caption[1]`, so a hard-coded step
agrees there and nowhere else - and `caption[1]` is what resolving the path as
XPath yields too, which is what makes the wrong answer read as a right one
(markup-carve/carve#1560).

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
`--report`, `--check-loss` and `--list-table`.

Every exit takes the list-table option described under
["A table whose cells hold blocks can be written as a list table"](#a-table-whose-cells-hold-blocks-can-be-written-as-a-list-table).

Adapters may normalize editor-specific markup before the core policy. The
portable adapter names are `generic`, `tiptap`, `prosemirror`, `ckeditor`,
`tinymce`, `word`, and `google-docs`. Unknown adapters must be rejected.

## Conformance fixtures

HTML import is gated at three scales. The normative fixture directories below
pin source, published AST, and diagnostics. `resources/html-import-construct-coverage.json`
classifies every construct derived from the normative grammar, including
importable constructs that still have no shared fixture. The converter runner
also hands every fixture to Rust, JavaScript, and PHP and reconciles known drift
in `resources/converter-drift.txt` in both directions.

The wider population gate renders all 1,384 corpus documents and imports that
HTML through the pinned JavaScript engine. At the current pin, 1,383 complete,
1,329 imports are canonical-writer fixed points, and 1,351 preserve visible
rendered text. These are pinned measurements, not claims that HTML is lossless;
any movement forces inspection and an explicit baseline update.

Each directory under `tests/html-import` contains `input.html`,
`expected.crv`, `expected.ast.json`, and `expected.report.json`. Implementations
may add platform-specific fixtures, but shared fixtures define the portable
minimum. AST comparison ignores object-key order and absent optional fields;
source comparison uses the canonical writer byte-for-byte. Diagnostic fixture
objects are minimum matches: implementations may add optional location fields.

`expected.report.json` IS THE REPORT, NOT A CONFIGURATION (carve#1886). Its
`mode` and `adapter` are fields the import RETURNS, asserted like any other, and
a fixture cannot ask to be imported some other way through it: a fixture
declaring `"mode": "roundtrip"` would be run in `safe` and fail on the very
field it set. That is why all of them read `safe`.

ONE OPTION IS SET PER FIXTURE, and it is not a mode. A fixture may add
`options.json`, an object keyed by the JavaScript option names, and every
runner imports that fixture with those options: the Rust and PHP runners map
the names onto their own, and the converter runner passes the CLI flag. The
only key it accepts is `listTableForBlockCells` (`--list-table`), because the
list-table form is a different document rather than a different policy over the
same one, and a fixture is the only way to pin it across engines. Mode and
adapter stay out, for the reasons below.

A SHAPE THAT ONLY ANOTHER MODE REACHES GOES ELSEWHERE, and it is already
covered: the vocabulary gate sweeps the whole corpus in `safe`, `semantic` and
`roundtrip`, which is how `attribute-preserved` - reachable only under
`roundtrip` - is exercised without a fixture (carve#1878). An engine-local test
is the other home. Teaching four runners to read the field would buy the fixture
set a mode it has never needed.

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
| `derived-endnotes-section` | a reference-less endnotes `<section>`, whose wrapper and both attributes are derived, so nothing is reported - and whose one-item list spells its looseness with `{loose}` |
| `synthesized-wrapper-path` | a bare inline run wrapped in a paragraph the importer added, whose diagnostic is numbered among the body children rather than inside the wrapper |
| `container-round-trip` | a rendered callout and a named container, which come back as the containers they were written from rather than as a body and a `div` |
| `caption-attributes` | an attribute on a `<figcaption>`, dropped because a caption line has no slot for it, and reported rather than dropped in silence |
| `table-caption-attributes` | an attribute on a table's `<caption>`, the other spelling of a caption line, reported by the same rule |
| `traversal-shaped-index` | the three index exemptions on one document - an item, a row and a cell, none of which whitespace can move |
| `table-caption-index` | the same table caption written across lines, where it is the SECOND child and no exemption applies to it |
| `container-nesting` | containers two and three deep, whose fences widen INWARD because that is the form `carve fmt` writes |
| `attribute-less-div` | a bare `<div>` unwrapped to its content beside an id-bearing one that keeps its fence, which is where that boundary sits |
| `unsupported-element-keeps-its-blocks` | unsupported elements around blocks, beside loose text, nested two deep, inside a list item and inside a paragraph, each replaced by its children with one row |
| `container-label-keeps-the-fence` | a `<div>` kept by its grouping label alone, an id-bearing one whose label comes back on the opener, and one whose label the lift refuses so it unwraps after all |
| `diagnostic-order` | two losses in one table, whose rows follow the document and not the order the importer builds them in |
| `destination-less-link` | an anchor and an image with no destination the source can carry, which come back as their content rather than as `[t]()` |
| `denied-scheme-destination` | a `javascript:` anchor, a split-scheme anchor that keeps its `id`, and a `data:` image, which come back as their content with one warning each |
| `marker-shaped-cell` | a table cell whose whole payload is a span marker, escaped so the cell survives |
| `symbol-sigil-escape` | a symbol sigil in imported text, escaped so it stays the text the HTML held |
| `extension-sigil-escape` | text ending in `:name` before a span and before a link, whose colon is escaped so the two do not join into an inline extension |
| `detached-caption-caret` | a paragraph that looks like a caption line under an image, escaped so it stays a paragraph |
| `note-reference-in-a-span` | a span whose text opens a note-reference label, escaped beside the unlabeled caret that needs no escape |
| `empty-definition-description` | an empty `<dd>`, dropped with a row that declares it, where the bare colon line would have taken the `<dt>` too |
| `empty-definition-description-not-last` | the same empty `<dd>` with an entry after it, where the list is broken rather than letting the next term inherit the description below |
| `endnotes-section-not-last` | an endnotes section with a paragraph after it, which keeps its position through `::: footnotes` |
| `whitespace-only-block` | a `<p>` holding one no-break space, kept as itself, beside the ASCII-space and tab spellings that carry nothing and are dropped with a row |
| `table-degraded` | a `<thead>` between two `<tbody>` runs, which the row-grouping field cannot describe: the head is a prefix of the rows and the foot a suffix |
| `list-table-for-block-cells` | a table with a list, a code block and two paragraphs in its cells, imported with `options.json` setting `listTableForBlockCells`: spans as `^` and `<`, a `<th>` outside the header rows as `{header}`, a cell class on its item, a hard break kept, a lone `^` escaped, and the row's `id` reported |
| `task-state-is-consumed` | a `data-task-state` read as the item's state beside a ticked box that needs none, and a value outside the enumeration that stays the author's attribute |
| `same-kind-strong-nesting` | a strong directly inside a strong where both levels need braces, whose inner level is unwrapped with a row (PART 11 §1c) |
| `same-kind-superscript-nesting` | the same nesting on a braced-only kind, where the unwrap loses the second raise and the row says so |
| `same-kind-indirect-nesting` | an emphasis inside a strong inside an emphasis, kept because the braced strong between them starts its own scope (PART 9 §9 E3, #2091) |
| `table-cell-hard-break` | a `<br>` in a cell written as one space between words, as nothing at the cell's end, and as a space at the edge of a span inside the cell, one row per break (PART 11 §1b) |
| `adjacent-code-spans` | two `<code>` elements with nothing between them, separated by an empty delimited comment so the backtick runs do not merge (PART 11 §10k N3) |
| `link-edge-whitespace` | edge whitespace of a link and a span moved outside, merged at a join and dropped at a block edge, beside a no-break space, a whitespace-only label and an edge image that stay |
| `formatting-around-link` | formatting around a link drops block-edge and redundant padding while keeping the only separator, including asymmetric and nested cases |
| `mathml-without-tex` | presentation-only MathML imported as its text where the tokens are linear, and a fraction dropped where they are not |
| `mathml-fallback-image` | a formula beside its fallback image imported once, including through the image's `alt` when the `<math>` carries no TeX |
| `empty-list` | a `<ul>` and an `<ol>` with no item, attributed inside a container, bare, and nested in an item, each dropped with one row |
| `section-wrapper-id` | a `<section>` around a heading whose authored id comes back on the heading, a derived id that does not, a heading id that wins over the section's, and a section class that is dropped with a row |
| `empty-paragraph` | an attributed empty `<p>` and one holding only an empty `<span>`, each dropped with one row, beside an attributed `<hr>` that keeps its attribute |
| `comment-beside-dropped-element` | a comment beside an empty unknown element and beside a `<noscript>`, written as a block comment because a dropped element leaves no inline run, and beside an unknown element with text, which keeps it inline |
| `authored-role` | an authored `role` on a container, a span and a list item, kept because the renderer derives none of them |
| `url-list-attribute` | a `srcset` on an image, kept because a URL-list attribute is hardened by the renderer rather than refused |
| `adjacent-definition-lists` | two attribute-less `<dl>` elements joined into one list with a row, beside a paragraph and an attributed `<dl>` that each keep a list apart |
| `figure-target-attributes` | a figure around a code block and around a quote, each sharing one attribute line with its target, and an image whose own braces keep its attributes apart |
| `table-cell-multi-line-comment` | a comment holding a line break dropped from a cell with a row, a one-line comment among a cell's blocks written inline, and a multi-line comment outside any cell kept |
| `lone-bracket-in-bracketed-content` | an unpaired `[` or `]` inside a span or link text, escaped in the minimal form as in `[\[]{.b}`, beside balanced pairs that stay bare (PART 11 §5) |
| `paren-after-a-closed-bracket` | a `(` right after a paired bare `]` that would open a closing destination, escaped as `[a]\(b)` at top level, in a span, across code and emphasis, and around nested parentheses, beside `f(x)`, `[a] (b)`, `[a](b c)` and `[a]()` that stay bare (PART 11 §5) |
| `auto-text-link` | a link to a heading whose text repeats the heading, written as `[Target](#Target)` and not recovered as the cross-reference `</#Target>` |
| `editorial-comment` | a `critic-comment` span, kept as a classed span and not recovered as the editorial comment `{#note#}` |
| `forced-strike` | an `<s>` inside a word, written in the braced form `a{~b~}c` |
| `forced-strong` | the same intraword case for `<strong>`, written as `a{*b*}c` |
| `forced-underline` | the same intraword case for `<u>`, written as `a{_b_}c` |
| `inline-extension` | a span whose class names an extension, kept as a classed span and not recovered as an inline extension |
| `local-hard-break-block` | a `hardbreaks` div, written as a `::: hardbreaks` container with an explicit backslash break rather than as the local hard-break block |
| `math-block-and-mathml` | a display-math `div` and a block and an inline `<math>` read through `alttext`, all written in the core math form, with an `encoding-assumed` row for each `alttext` |
| `substitution` | a `<del>` followed by an `<ins>`, written as `{-old-}{+new+}` and not merged into the substitution `{~old~>new~}` |
| `code-language-hints` | one code block per recognized language-hint convention, plus a conflicting pair where the `code` child's class wins, the hinting attribute kept on the block as well |
| `attribute-value-pipe` | a pipe in an attribute value on a cell and on a span inside a cell, backslash-escaped so the row does not split |
| `attribute-value-line-break` | an attribute value holding a line break, dropped with a row because a Carve attribute value cannot hold one |
| `definition-description-without-term` | a `<dd>` with no `<dt>` before it, emitted as blocks ahead of the list with a row, including a list holding no entry whose class is dropped |
| `cell-text-align-columns` | cell CSS maps to column markers without unmapped-style rows |
| `cell-text-align-overrides` | explicit body alignment overrides the header default |
| `cell-text-align-declarations` | the last supported declaration wins; unsupported values and priority suffixes remain unmapped |
| `cell-text-align-unmapped` | supported alignment maps while unrelated CSS and unsupported values report loss |
| `heading-multi-line-comment` | an HTML comment holding a line break inside a heading, dropped with a row because a heading is one line |
| `summary-holding-blocks` | a `<summary>` holding blocks flattened into the container title, with a row per unwrapped element and per dropped attribute |
| `container-class-a-fence-word-spells` | a digit-leading class, which `explicit_identifier` admits, consumed as the fence word |
| `empty-heading` | a bare empty heading and an attributed whitespace-only one, each dropped with one row |
| `code-span-holding-blocks` | two blocks flattened into a `<code>`, joined with no separator and the lost boundary reported |

Because source comparison is byte-exact, every `expected.crv` here is also a
fixed point of `carve fmt` in all three engines. A fixture that is not one
would be pinning source no writer produces, and the first engine to run its
formatter over it would disagree.

## CSS policy

On `th` and `td`, importers MUST map an explicit `text-align: left`,
`text-align: right`, or `text-align: center` to the native cell alignment in
`safe`, `semantic`, and `roundtrip` modes. Property names and values are
case-insensitive; surrounding whitespace is ignored. The last supported
declaration wins. Only those exact values are mapped; priority suffixes such
as `!important` remain unmapped. A mapped declaration MUST NOT produce
`style-unmapped`.

A cell in the leading header rows supplies the column default through `|=<`, `|=>`, or `|=~`.
A body cell repeating that default needs no marker; a different explicit
alignment stays on that cell through `|<`, `|>`, or `|~`. A headerless table
keeps each cell's explicit alignment. Mapping does not require every cell in
a column to agree. Unsupported values, such as `justify`, and unrelated
unmapped declarations still produce `style-unmapped`.

This requirement covers horizontal alignment on table cells only. It does
not change CSS mapping on other elements or the treatment of
`vertical-align` in `safe` mode (carve#2422).

Beyond that required mapping, CSS is not parsed generally. Implementations
may map only explicit declarations with stable Carve semantics, initially `text-align`, `font-weight`,
`font-style`, and `text-decoration`. All other declarations produce
`style-unmapped` in `semantic` and `roundtrip` modes, except inside bytes kept
whole under `raw-preserved`, where ["a refused declaration in `style` is a
refused attribute"](#a-refused-declaration-in-style-is-a-refused-attribute)
governs.

## Resource limits

Importers must bound DOM depth, AST depth, node count, and diagnostic count.
On a structural limit, return or throw a typed error rather than emitting a
partial document. A diagnostic cap may instead replace its last entry with the
`diagnostics-truncated` error diagnostic.
