## A recognized opener in a body needs no blank line above it

The authored-base clause (PART 9 SS17, PART 9 SS24 C3, carve#1729) says where an
opener may sit, not what has to sit above it. A recognized opener at or past the
body's minimum column belongs to that body whether a blank line precedes it or
not, so it ends whatever block is open and starts its own. A footnote body, a
definition body and a list item all answer alike.

::: compare

```carve
[^n]: intro
  > quote
  # heading

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <blockquote><p>quote</p></blockquote>
      <h1 id="heading">heading</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: term
:  intro
   > quote
   # heading
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>intro</p>
    <blockquote><p>quote</p></blockquote>
    <h1 id="heading">heading</h1>
  </dd>
</dl>
```

:::

::: compare

```carve
- intro
  > quote
  # heading
```

```html
<ul>
  <li>intro
    <blockquote><p>quote</p></blockquote>
    <h1 id="heading">heading</h1>
  </li>
</ul>
```

:::

Being an opener is the whole of it. A line at the same place that opens nothing
is not rebased and does not end anything: it lazily continues the quote, and the
extra indentation is not content either.

::: compare

```carve
[^n]: intro
  > quote
    ordinary line

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <blockquote><p>quote
ordinary line</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The rule reaches every member of a run, not only the first. Each opener ends the
block the one before it started.

::: compare

```carve
[^n]: intro
  > quote
  # heading
  - item

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <blockquote><p>quote</p></blockquote>
      <h1 id="heading">heading</h1>
      <ul>
        <li>item</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The clause is about bodies, and the top level is not one. With no minimum content
column to reach, an indented opener under an open paragraph stays column-strict
and folds into it as text.

::: compare

```carve
intro
   # heading
```

```html
<p>intro</p>
<section id="heading">
  <h1>heading</h1>
</section>
```

:::

A description line is the other place a blank line turns out not to matter -
but the clause says where an opener may sit, and a description body's floor is
its own content column. An opener BELOW that column does not reach the body as
an opener: it is classified in whatever context survives it (PART 9, `BELOW THE
BODY'S COLUMN THE BODY ENDS`). At the top level that context needs column 0, so
a `>` one column in opens nothing and folds into the body's paragraph as text
(carve#3295).

::: compare

```carve
:: term
:  definition
 > quote
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<blockquote><p>quote</p></blockquote>
```

:::

Inside a list item the surviving context is the item, and the same quote reaches
the ITEM's content column - so it opens there, as a sibling of the definition
list rather than inside the `dd`. The base the definition list established
governs the definition list, not the next opener written below it.

::: compare

```carve
- intro

  :: term
  :  definition
   > quote
```

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>definition</dd>
    </dl>
    <blockquote><p>quote</p></blockquote>
  </li>
</ul>
```

:::

A footnote body follows the same surviving-context rule. The quote is below the
description's column, so the description ends; it still reaches the footnote's
minimum column and therefore opens a structural sibling there.

::: compare

```carve
[^n]: intro

   :: term
   :  definition
    > quote

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <dl>
        <dt>term</dt>
        <dd>definition</dd>
      </dl>
      <blockquote><p>quote</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
