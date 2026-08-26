---
description: The contract for converting HTML into Carve - a migration boundary, deliberately not a general HTML serializer.
---

# HTML import contract

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

An HTML comment was dropped in every mode with nothing reported, and the usual
reason for dropping - the language has no spelling for the shape - does not
apply: **Carve has comments** (markup-carve/carve#1709). Dropping one was
therefore a choice to lose bytes the format can represent, in a mode whose whole
job is fidelity, and it was a choice nobody had made.

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
a silent content change; the drop plus its row is the honest answer, and the row
is the point.

**The comment is not relocated to make it spellable.** Moving an inline comment
out to a block comment would put text somewhere the author did not write it, and
`roundtrip` reading its own output would then find the document had moved. Where
only one position can be represented, the other is reported.

**A comment inside an element preserved as raw HTML needs no row.** It is inside
the preserved bytes and reaches the output with them.

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

**The drop is reported and the keep is not**, and that asymmetry is the whole
argument. Dropping a block the input had is a real loss, so it takes
`element-dropped` - a code that already exists, so no vocabulary grows for
this. Keeping a character costs nothing to declare because nothing is given up:
it survives the write intact. A silent drop would be the one outcome the loss
report exists to prevent.

**The spacer argument is real and is not this rule.** Word, CKEditor and
TinyMCE all emit `<p>&nbsp;</p>` as a layout spacer, so a migration may well
want it gone - but that is an OPT-IN on `migrate`, not a silent default that
throws away content the language can spell.

`whitespace-only-block` pins all three rows, plus the two non-ASCII spaces the
class reaches.

## A declared loss is a ceiling, not a licence

A diagnostic states what the import gave up. It does not license giving up more
than it names. An importer may lose what it declares AND NO MORE - so a source
that damages a neighbouring construct on the way to the declared loss is wrong
even though the row is present and honest about its own subject
(markup-carve/carve#1608).

An empty `<dd>` is the shape that makes the rule concrete, because Carve has no
spelling for it:

```html
<dl><dt>term</dt><dd></dd></dl>
```

Six candidate spellings were probed and none works. `: `, `:  `, `: {}` and a
tab after the colon each leak a `:` into the text or fold into the term above,
and a colon followed by three spaces renders `<dd>&nbsp;</dd>`, which is not
empty. The bare colon line is the worst of them: it is read as a continuation of
the term, so the re-render is

```html
<dl>
  <dt>term
:</dt>
</dl>
```

and the `<dt>` is damaged as well as the `<dd>` lost. That is a loss the row
does not declare, which is what this rule forbids.

The import writes the term alone:

```
:: term
```

with `structure-unspellable` on the `<dd>`. That code already says exactly what
happened - the empty description survives in the AST, as a
`definition_description` with no children, and not in written Carve - and the
loss is now bounded by the row that declares it.

**No general key covers this one.** The one-item and one-block `<dd>` shapes
above take `{loose}`, because what they needed was a way to spell a tightness a
blank line could not reach. An empty description has no blocks at all, so there
is nothing for a looseness key to say about it, and the answer here is the
diagnostic rather than a second spelling
(markup-carve/carve#1607, markup-carve/carve#1612).

### The ceiling has a second side: an entry after the dropped one

Writing the term alone is enough only while the dropped entry is the last one.
Put an entry AFTER it and the same import breaks the ceiling in the other
direction (markup-carve/carve#1636):

```html
<dl><dt>t1</dt><dd></dd><dt>t2</dt><dd>d2</dd></dl>
```

Consecutive `::` lines SHARE the description written below them - that is the
`<dl>` model the syntax mirrors - so dropping the empty description and writing
both terms into one list gives `t1` the description `d2`, which it never had.

**An ADDITION is not a loss, and no row can declare it.** A loss that stays
inside a declared ceiling is acceptable because the reader is told what is
missing; an addition changes what the surviving term MEANS rather than what it
fails to say, and a reader who is told the empty description was dropped has
been told nothing about `t1` acquiring `d2`. So the ceiling binds in both
directions: an importer may lose what it declares AND NO MORE, and it may add
nothing at all.

The import BREAKS THE LIST at the dropped entry. `t1` keeps having no
description, `t2` keeps exactly `d2`, and nothing gains meaning it did not have:

```
:: t1

%%

:: t2
: d2
```

```html
<dl>
  <dt>t1</dt>
</dl>
<dl>
  <dt>t2</dt>
  <dd>d2</dd>
</dl>
```

**A BLANK LINE IS NOT THE BREAK, and the separator has to be written.** A blank
line between two entries does not loosen a definition list and does not end one
either - `:: t1`, a blank line, `:: t2`, `: d2` is ONE list with two terms
sharing `d2`, which is the outcome this rule forbids, and the canonical writer
removes the blank line again. The comment line is what ends the first list, and
it is the only construct that can: the separator has to render nothing where it
stands AND stay where it was written, and of the kinds that render nothing,
`comment` is the only one that does both. Frontmatter is document-start only. A
link-reference definition and a footnote definition are hoisted to the end of
the document by the canonical writer, which puts the two lists back together, so
they do not survive `carve fmt`. An abbreviation definition stays put and is a
fixed point, but it defines an abbreviation the input never had - an addition,
which is the thing being avoided.

**The grouping is a real loss and takes its own row.** `structure-split` says
one source structure was written as more than one, because writing it as one
would have changed what its parts mean. It is NOT `structure-unspellable`: that
code is for a shape the syntax cannot spell at all, and here every part is
spellable and every part is present and exact - what the source cannot say is
that they were one list. Both rows are reported, in the document order the list
section requires: `structure-split` on the `<dl>`, then `structure-unspellable`
on the `<dd>` that is gone.

A spelling for a term with no description would settle this shape and the
one-entry shape at once, and it is the only answer that loses nothing. It is a
language change, declined once already (markup-carve/carve#1608), and it stays
on the table for 0.2; this rule is what holds until then.

`empty-definition-description-not-last` pins the shape. The one-entry fixture
cannot see it - both readings of a dropped LAST entry write the same source -
which is why it passed throughout while both engines merged the two terms.

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
for a structure Carve source has no spelling for, and here the language has one
- which is also the whole argument. Treating placement as a rendering artifact
would be defensible only if Carve could not say otherwise, and it can, so
discarding a position the language can express is a loss with no justification
behind it. Corpus document `122-footnotes-placement` is authored with the
directive, so the shape is not a bridge-only corner.

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

The class the fence word consumes must be one a fence opener can spell,
`[a-zA-Z_][\w-]*` per PART 9's `admonition_open`. A class outside that shape -
`2col` - would be written after the colons and read back as a paragraph, so
that element keeps the generic `div` node where the class survives as a class.

**A `<div>` that carries nothing only a container can hold is UNWRAPPED to its
content, and no `:::` fence is written** (markup-carve/carve#1578,
markup-carve/carve-rs#1315). Such a `<div>` carries nothing the container is
needed for, so the fence would cost a reader two lines of markup and tell them
nothing. The element not surviving the round trip is the honest outcome, because
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
  HTML. It is not safe for untrusted input. What "unsupported" means for a
  captioned wrapper is a property rather than a tag list, and it is stated under
  ["`roundtrip` rebuilds a figure only when a Carve spelling reproduces it"](#roundtrip-rebuilds-a-figure-only-when-a-carve-spelling-reproduces-it).

All modes remove `script`, `style`, `template`, `noscript`, and event-handler
attributes. `roundtrip` may recover source embedded by a Carve renderer, but
must never execute it.

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
  preserves an element as raw HTML MUST report the element's own refused
  attributes under this code instead. Its severity MUST be `error` where the
  attribute is one a renderer refuses for safety - an event handler, an
  injection sink, a value carrying a denied URL scheme - and `info` otherwise.
  The `error` is not a failed import; it is the strongest thing the report can
  say, and this row earns it because `roundtrip` is the mode that is not safe
  for untrusted input and this is the row saying such an attribute is LIVE in
  the output. A dropped handler already spends `warning`, so spending `warning`
  here too would tell a filter nothing about which of the two it is looking at.
- `style-unmapped`: CSS had no explicit semantic mapping.
- `table-degraded`: a table could not be represented structurally.
- `raw-preserved`: unsupported trusted markup was retained as raw HTML.
- `structure-unspellable`: the import produced a structure Carve source has
  no spelling for, so it survives in the AST and not in written Carve. The
  AST-returning entry point loses nothing and reports nothing; the one that
  writes source reports this.
- `structure-split`: one source structure was written as more than one,
  because writing it as one would have changed what its parts mean. Everything
  inside is kept exactly and every part is spellable; what is lost is the
  grouping. It is not `structure-unspellable`, which is for a shape the syntax
  cannot spell at all. The AST-returning entry point loses nothing and reports
  nothing; the one that writes source reports this.
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
implementations, which is why naming them is worth a paragraph:

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

WHY THIS IS A REQUIREMENT RATHER THAN A QUALITY OF IMPLEMENTATION. The shared
fixture runners compare diagnostics POSITIONALLY. With no defined order, a
fixture holding more than one diagnostic was safe only where the implementations
happened to agree anyway - which they do when the losses sit in separate
top-level blocks, and did not when two sit under one parent. Such a fixture
would pin whichever order its author's engine produced, and that is why
`table-caption-index` had to be kept to a single row (carve#1560). The runners
stay positional: they are the check, and comparing unordered as well would state
a rule that nothing enforces. The `diagnostic-order` fixture is the case this
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
`--report`, and `--check-loss`.

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
| `container-label-keeps-the-fence` | a `<div>` kept by its grouping label alone, an id-bearing one whose label comes back on the opener, and one whose label the lift refuses so it unwraps after all |
| `diagnostic-order` | two losses in one table, whose rows follow the document and not the order the importer builds them in |
| `destination-less-link` | an anchor and an image with no destination the source can carry, which come back as their content rather than as `[t]()` |
| `marker-shaped-cell` | a table cell whose whole payload is a span marker, escaped so the cell survives |
| `symbol-sigil-escape` | a symbol sigil in imported text, escaped so it stays the text the HTML held |
| `detached-caption-caret` | a paragraph that looks like a caption line under an image, escaped so it stays a paragraph |
| `note-reference-in-a-span` | a span whose text opens a note-reference label, escaped beside the unlabeled caret that needs no escape |
| `empty-definition-description` | an empty `<dd>`, dropped with a row that declares it, where the bare colon line would have taken the `<dt>` too |
| `empty-definition-description-not-last` | the same empty `<dd>` with an entry after it, where the list is broken rather than letting the next term inherit the description below |
| `endnotes-section-not-last` | an endnotes section with a paragraph after it, which keeps its position through `::: footnotes` |
| `whitespace-only-block` | a `<p>` holding one no-break space, kept as itself, beside the ASCII-space and tab spellings that carry nothing and are dropped with a row |

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
