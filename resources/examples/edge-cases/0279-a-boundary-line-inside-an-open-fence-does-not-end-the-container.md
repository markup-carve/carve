## A boundary line inside an open fence does not end the container

PART 9 §17 L3 attaches ONE BLOCK of ANY kind, "up to the next blank line,
sibling marker, or a further `+`". That list bounds the ATTACHED BLOCK, and a
block's own extent is settled before the list is ever consulted: a fenced block
runs from its opener to its matching closer, so every line between the two is
INSIDE the one block L3 attached. A blank line there is not "the next blank
line" any more than the closer is "a sibling marker" - it is fence content, and
the boundary list never sees it.

The same holds one construct over, for a body collected by INDENTATION rather
than by a marker. §24 S1 MATCH PREFIXES places a line by the column it reaches
and never by its first character; §24 S2 FENCED BODY then makes the line
verbatim when the innermost matched container is a verbatim body; and §28 makes
a comment fence's body verbatim and invisible. None of the three asks what the
line looks like.

Seven rows, deliberately not one per cell. Each reaches a DIFFERENT collector,
and in every reader those collectors are separate loops that a fix to one leaves
untouched - which is the failure `carve-php#1003` had to correct and the reason
`278-a-list-marker-at-the-content-column-inside-an-open-fence` needed two rows
rather than one. Each of the three fence spellings appears, because the fence
kind is a real axis: a reader can survive a code fence and sever a colon fence
at the same boundary.

The seventh row arrived late, and why it did is worth recording. The list `+`
collector is the largest severing group of the whole class, and it was the one
cell this category could not pin, because the executable spec severed it too:
its `+`-attach extent helpers were spelled twice and only one of the two
consulted any fence state (`carve#982`). A checker is not an argument - THE
EXECUTABLE ARTIFACTS DECIDE NOTHING - but a row whose expectation nothing in the
repo could hold is not reviewable either. With the checker corrected against L3
the cell became committable, and it is committed here.

### A definition line inside an attached code fence

The worst of them, and the reason this category exists. `[^z]: zz` sits inside
an open code fence, so §24 S2 and §28 make it verbatim text: it defines nothing,
and §17 L3's boundary list does not name a definition line at ALL, so nothing
here ends the attached block early. The note body holds the whole fence.

The `+` attach into a footnote body is already pinned by
`66-footnote-with-multiple-blocks-2`; this row only says what a fence inside
that attached block does.

What the three readers do instead is worth stating, because it is not a near
miss: each of them ends the note body at the definition line, the fence is left
unterminated, and `b` escapes the note entirely to become the document's FIRST
block - printed ahead of the paragraph that references the note. A line of
verbatim code text moved a block from the end of the document to the beginning.

::::: compare

````carve
[^f]: n
+
```
a
[^z]: zz
b
```

see[^f]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <pre><code>a
[^z]: zz
b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::

### A blank line inside the same fence

The boundary L3 DOES name, in the one position where it cannot apply. The blank
is between the fence's opener and its closer, so it is code text; the attached
block ends at the closer, as it did above.

Stated as its own row because the two are different predicates: one reader ends
the block on a definition line, the other on a blank, and a fix to either is
invisible to the other.

::::: compare

````carve
[^f]: n
+
```
a

b
```

see[^f]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <pre><code>a

b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::

### The same blank, in a definition list's body

A third row for the same blank line because a `dd` is collected by a DIFFERENT
loop than a footnote body in every reader, and `carve-php#1003` is the
precedent for one row letting the other half stay broken and still read as done.
The `+` attach into a `dd` is pinned by `25-definition-lists-3`.

::::: compare

````carve
:: t
:  d
+
```
a

b
```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <pre><code>a

b
</code></pre>
  </dd>
</dl>
```

:::::

### A definition line inside an attached COLON fence, in a block quote

The same boundary, a different fence kind, and a different answer - which is
exactly why the fence kind is its own axis. A colon fence's body is NOT verbatim:
it holds blocks, so `[^z]: zz` really is a definition. §17 L6 collects it and
leaves NO TRACE where it was written, and the same clause has it INTERRUPT the
open paragraph, so `b` begins a new one rather than folding back into `a`.

Two paragraphs, therefore, where the control (the same document without the
definition line) has one. What no reading gives is a div that ENDS at the
definition line, which is the answer one reader produces.

::::: compare

```carve
> q
+
:::
a
[^z]: zz
b
:::
```

```html
<blockquote>
  <p>q</p>
  <div>
    <p>a</p>
  </div>
</blockquote>
```

:::::

### A list marker at the body's column inside an item's colon fence

`- m` sits at the div body's own column zero, and the div body holds blocks, so
the question is not §24 S2 this time but §10 I2: LIST MARKERS NEVER INTERRUPT. A
marker line folds into the open paragraph as lazy continuation, and §10 I6
applies that to EVERY open paragraph, containers included. So the div holds one
paragraph of three lines and ends at its closer.

This is the row that separates the fence kinds most sharply. Put the same marker
inside a CODE fence at the same column and §24 S2 answers it instead, which is
`278-a-list-marker-at-the-content-column-inside-an-open-fence`. Two clauses,
two paths, one answer: the line is content. All three readers close the div at
the marker, open a real list, and leave a stray empty div behind at the end.

::::: compare

```carve
- x
  :::
  a
  - m
  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a
- m
b</p>
    </div>
  </li>
</ul>
```

:::::

### A blank line inside an item's comment fence

§28 makes a comment fence's body verbatim AND invisible, so the blank line, the
text around it and the closer are all inside the fence and none of them renders.
The item is left holding nothing visible, which is `<li></li>` -
`117-footnote-definition-inside-a-container-is-collected-2` and
`16-reference-link-4` already pin that shape for an item whose only content is
invisible.

The item also stays TIGHT: §17 L1 loosens on a blank-line-separated second
PARAGRAPH, and there is no paragraph here at all. A reader that lets this blank
line out of the fence gets the opposite of invisible - it prints the comment's
body as two paragraphs.

::::: compare

```carve
- %%%
  a

  b
  %%%
```

```html
<ul>
  <li></li>
</ul>
```

:::::

### The same blank, in a block attached to a LIST ITEM

The fourth collector for the one boundary, and the one that severs hardest. A
list item's `+` attach is a separate loop again - separate from the footnote
body, separate from the `dd`, separate from the block quote - so nothing the
other three `+` rows pin reaches it.

What severing costs here is not a rearranged block but a broken document. End
the attached block at the blank and the item keeps `a` alone, the closing fence
is never consumed, and that stray delimiter run opens an EMPTY inline code
element at document level: output that no reading of the source licenses, from
an input whose only unusual feature is a blank line in a code block. L3 gives
the whole fence to the item and leaves nothing at document level but `z`.

The item also stays TIGHT. §17 L1 loosens on a blank-line-separated second
PARAGRAPH; this blank is code text and there is no second paragraph, so it is
not the kind of blank L1 asks about.

::::: compare

````carve
- x
+
```
a

b
```

z
````

```html
<ul>
  <li>x
    <pre><code>a

b
</code></pre>
  </li>
</ul>
<p>z</p>
```

:::::

### A blank line inside an item's INDENTED comment fence, with lead text

The sixth row above is the same fence with the same interior blank, and it
passes everywhere. The difference is one word. There the fence opens ON the
marker line, so the item holds nothing visible at all and there is no paragraph
for looseness to wrap - the tight and the loose answer coincide, and the row
cannot see this cell. Put `x` on the marker line and the two answers separate
(carve#985).

§28 makes a comment fence's body verbatim AND invisible, so the blank line, the
text around it and the closer are all fence content and none of them renders.
§17 L1 loosens an item on a blank-line-separated second PARAGRAPH, and this item
has no second paragraph anywhere: L1b says outright that a line rendering
nothing "is not a paragraph, which is why it cannot BE the second one". The item
is tight, and the document renders exactly one visible thing.

This reaches a collector none of the seven rows above touches. Those pin the
extent of the ONE block a `+` attaches (§17 L3); this is the item collector's
OWN blank-line decision, a separate reader of separate state, and a fix to the
first leaves it untouched.

::::: compare

```carve
- x
  %%%
  a

  b
  %%%
```

```html
<ul>
  <li>x</li>
</ul>
```

:::::

### The same item, with the blank line OUTSIDE the fence

The control the row above needs. Same item, same fence, same lead text; the
blank line has moved past the closer, where it separates two paragraphs of the
ITEM and §17 L1 does loosen.

Without this document the row above is satisfied by a reader that simply stops
loosening whenever a comment fence appears in an item, which is not the rule and
would be a second defect wearing the first one's answer. The two documents
differ only in which side of the closer the blank line sits on, and they must
answer differently.

::::: compare

```carve
- x
  %%%
  a
  %%%

  b
```

```html
<ul>
  <li><p>x</p>
    <p>b</p>
  </li>
</ul>
```

:::::

### A blank line inside an item's indented colon fence, with lead text

The same collector, the other fence kind, and the kind is a real axis here as it
is above: a colon fence's body is NOT verbatim, so this blank line is not
invisible the way the comment fence's was. It genuinely separates two paragraphs
- of the DIV.

What it does not do is give the ITEM a second paragraph. §17 L1 asks for a
blank-line-separated second paragraph of the item, and the div is ONE block, so
the item stays tight and keeps `x` unwrapped. Both answers are visible in the
one output: loose inside the div, tight outside it, from a single blank line. A
reader that lets that blank reach the item's looseness scan gets `<p>x</p>` and
an otherwise identical div.

::::: compare

```carve
- x
  :::
  a

  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a</p>
      <p>b</p>
    </div>
  </li>
</ul>
```

:::::

### The same item, with the blank line OUTSIDE the colon fence

The control for the colon spelling, and it is not redundant with the comment
one: the two rows are the two branches of the same tracker, and a reader can
carry one kind and miss the other, which is exactly the shape this whole
category keeps finding.

Here the blank follows the closer, so the div is one block and `b` is a second
paragraph of the item. The item is loose, and the div's own body - `a` alone,
with no interior blank - is a single paragraph.

::::: compare

```carve
- x
  :::
  a
  :::

  b
```

```html
<ul>
  <li><p>x</p>
    <div>
      <p>a</p>
    </div>
    <p>b</p>
  </li>
</ul>
```

:::::

The first seven rows were carried by `markup-carve/carve-js#884`,
`markup-carve/carve-php#1049` and `markup-carve/carve-rs#802` rather than
presented as a cross-reader agreement, because no engine answered the class
when they landed. All three engine tickets are closed now. The last four arrive
the same way, from `markup-carve/carve#985`, and the pinned reference build is
knowingly behind on the two that pin a defect - declared in
`resources/engine-pin-drift.txt` rather than tolerated.
