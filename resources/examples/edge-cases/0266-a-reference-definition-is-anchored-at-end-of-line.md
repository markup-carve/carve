## A reference definition is anchored at end of line

`reference_definition` ends in `newline`, and always has. All three engines and
the executable spec nevertheless read `[a]: /u zzz` as a definition with
trailing junk, and nothing in the grammar authorized that reading. carve#911
settled it the way the production already said: what follows the destination
and the optional title makes the production FAIL, so the line is an ordinary
paragraph.

The reason it matters is not tidiness. PART 7 promises that a slot which fails
to match "falls back to prose rather than silently dropping metadata", and at
this line there was no prose to fall back to -- the swallowing tail took
whatever the slot rejected. So the clause's promised failure mode was
unreachable here, and every narrowing at this line dropped metadata instead.
With the line anchored the promise holds, and the tab and cardinality rules at
both slots follow from the general rule with no special case.

::: compare

```carve
[a]: /u zzz

[a][]
```

```html
<p>[a]: /u zzz</p>
<p>[a][]</p>
```

:::

A quoted run after a title is junk in the same way. The title is read, and then
the line fails on what is left:

::: compare

```carve
[a]: /u "T" zzz

[a][]
```

```html
<p>[a]: /u “T” zzz</p>
<p>[a][]</p>
```

:::

### The tab, at both slots

The title slot and the trailing-attributes slot take `space` under PART 7, like
every other padding slot. Both sit on this line, and both were left unpinned by
carve#907 for the reason above: with the line unanchored, a tab there dropped
the metadata rather than producing the visible failure the clause names. Now it
produces the failure, so it can be pinned.

Each slot carries the tab-first form and BOTH mixed runs. A rule about a run
written as "the first character must be a space" passes the tab-first fixture
and admits `<SP><TAB>`; written as "the last character must be a space" it
admits `<TAB><SP>` instead. Both spellings have been written for real in this
org, in three languages, on one day.

The title slot:

::: compare

```carve
[a]: /u	"T"

[a][]
```

```html
<p>[a]: /u	“T”</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u 	"T"

[a][]
```

```html
<p>[a]: /u 	“T”</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u	 "T"

[a][]
```

```html
<p>[a]: /u	 “T”</p>
<p>[a][]</p>
```

:::

The trailing-attributes slot:

::: compare

```carve
[a]: /u	{.c}

[a][]
```

```html
<p>[a]: /u	{.c}</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u 	{.c}

[a][]
```

```html
<p>[a]: /u 	{.c}</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u	 {.c}

[a][]
```

```html
<p>[a]: /u	 {.c}</p>
<p>[a][]</p>
```

:::

### What the anchor does NOT reject

The line ending is `whitespace` -- a space or a tab -- which is the same
terminal `blank_line = {whitespace}` takes (PART 1, carve#890). So trailing
spaces and a trailing tab are still a line ending rather than content, and the
definition stands; a trailing NO-BREAK SPACE, EN QUAD or FORM FEED is content
under that same ruling, so a line ending in one is not a definition. A trailing
ZERO-WIDTH character is a third answer again: U+200B and U+FEFF are not
whitespace at all, so they never reach the line ending -- `link_destination`
reads them, the definition stands, and the character is in the href. The
trailing attribute block is peeled by a scan that trims the line ending first,
so that scan has to trim the SAME run the anchor accepts, or the same character
answers one way with a block on the line and another without one. Those shapes
are pinned in
`tests/separator-role-split.test.mjs` rather than here, because a trailing
whitespace run in a reviewable Markdown source file is one editor save from
vanishing -- and because what a document does with trailing whitespace is its
own question (carve#926).

And the glued form is untouched, because nothing is left over: `link_destination`
simply reads the braces.

::: compare

```carve
[a]: /u{.c}

[a][]
```

```html
<p><a href="/u{.c}">a</a></p>
```

:::

### A definition still INTERRUPTS, attribute block and all

The anchor changes what the pattern matches, and the pattern is read in nine
places rather than one: eight of them ask "is this line a definition" to decide
paragraph interruption, lazy continuation, the def-list fold, the container
scan, the item fold and the marker scan. While the pattern ended in a
swallow-everything tail those eight could test the RAW line and be right by
accident, because `[a]: /u {.c}` matched it raw. Anchored, they cannot: the
trailing attribute block has to be split off first, or a definition carrying
one stops interrupting anything and folds into the paragraph above it.

Nothing pinned that. Reverting all eight to the raw line left the entire suite
green, and a differential sweep then found 42 of 72 generated shapes moving.
These three are the sweep's representatives -- top level, inside a list item,
and inside a definition-list description.

::: compare

```carve
text
[a]: /u {.c}

[a][]
```

```html
<p>text</p>
<p><a href="/u" class="c">a</a></p>
```

:::

::: compare

```carve
- text
  [a]: /u {.c}

[a][]
```

```html
<ul>
  <li>text</li>
</ul>
<p><a href="/u" class="c">a</a></p>
```

:::

::: compare

```carve
:: term
:  def
[a]: /u {.c}

[a][]
```

```html
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
<p><a href="/u" class="c">a</a></p>
```

:::

The fourth is the one the other three cannot reach. A block quote's open
paragraph asks the same question in a SECOND place -- the lazy-continuation
test, not the paragraph collector -- and reverting only that one site left even
the differential sweep above unmoved. Here the definition has to interrupt, or
the line below it lazily continues INSIDE the quote:

::: compare

```carve
> text
[a]: /u {.c}
more

[a][]
```

```html
<blockquote><p>text</p></blockquote>
<p>more</p>
<p><a href="/u" class="c">a</a></p>
```

:::

Two more, found the same way: each of the eight sites was reverted on its own,
and three of them survived every shape above. A definition INSIDE a quote is
the third site -- it is what leaves the quote with no open paragraph, so a
following lazy line starts its own block instead of folding in:

::: compare

```carve
> text
> [a]: /u {.c}
lazy
```

```html
<blockquote><p>text</p></blockquote>
<p>lazy</p>
```

:::

And a definition after a blank line inside a list item is the fourth and fifth.
An invisible construct is not a second paragraph, so the list stays TIGHT
(PART 9 §17 L1/L2); with the raw predicate it loosens:

::: compare

```carve
- text

  [a]: /u {.c}

[a][]
```

```html
<ul>
  <li>text</li>
</ul>
<p><a href="/u" class="c">a</a></p>
```

:::

The CONTROLS. Every legal shape of the line still is one:

::: compare

```carve
[a]: /u "T" {.c}

[a][]
```

```html
<p><a href="/u" title="T" class="c">a</a></p>
```

:::
