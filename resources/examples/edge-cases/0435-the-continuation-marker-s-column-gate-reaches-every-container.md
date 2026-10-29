## The continuation marker's column gate reaches every container

A `+` at an open marker column attaches one block starting at that column in every container. A block at another column follows ordinary ownership rules (markup-carve/carve#3421).

A column below the body's minimum. The note consumes the comment and retains
the line as a new paragraph of the note (PART 0 X1, ruled on
markup-carve/carve#2978), so in a footnote body and a description body the
comment row no longer answers as the marker row does.

::: compare

```carve
[^a]: intro
%% c
 more

see[^a]
```

```html
<p>more</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The marker is no comment. It attaches nothing, and the paragraph lands at
document level, above the endnotes section.

::: compare

```carve
[^a]: intro
+
 more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro
+
more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The body's OWN minimum column is not column 0 either, so it is refused for the
same reason - the marker names one column, not a range reaching down to the
container's floor. An indented comment at that column is a different document
and stays inside the body, which is pinned above under "A comment in a footnote
body is invisible in both spellings". The comment where the marker was is an
ordinary line below the body column, so it closes the body (rule A,
carve#3885) and the follower is a document paragraph.

::: compare

```carve
[^a]: intro
%% c
  more

see[^a]
```

```html
<p>more</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^a]: intro
+
  more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro
+
more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Column 0 is what the marker does reach, and the positive row is what makes the
two above mean something: the same note, the same paragraph, one column over.

::: compare

```carve
[^a]: intro
+
more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A description body's content column is 3 here, so column 2 is below it. The
comment spelling retains the line in the `dd`:

::: compare

```carve
:: term
:  intro
%% c
  more
```

```html
<dl>
  <dt>term</dt>
  <dd>intro</dd>
</dl>
<p>more</p>
```

:::

And the marker, which attaches nothing: the ordinary rules put the paragraph
outside the `dd`.

::: compare

```carve
:: term
:  intro
+
  more
```

```html
<dl>
  <dt>term</dt>
  <dd>intro
+
more</dd>
</dl>
```

:::

At column 0 the description takes it, as a second block of the `dd`.

::: compare

```carve
:: term
:  intro
+
more
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>intro</p>
    <p>more</p>
  </dd>
</dl>
```

:::

A column never reaches into a quote (§10 I5,
markup-carve/carve#1384), and the marker does not reach out of one for it. The
quoted paragraph is closed here so the row asks about the COLUMN and nothing
else; the blank-line control and the comment control agree with each other.

::: compare

```carve
> intro
>

  more
```

```html
<blockquote><p>intro</p></blockquote>
<p>more</p>
```

:::

::: compare

```carve
> intro
>
%% c
  more
```

```html
<blockquote><p>intro</p></blockquote>
<p>more</p>
```

:::

::: compare

```carve
> intro
>
+
  more
```

```html
<blockquote><p>intro</p></blockquote>
<p>+
more</p>
```

:::

At column 0 the marker attaches, which is the only spelling that puts a block
into a quote without a `>` in front of it.

::: compare

```carve
> intro
>
+
more
```

```html
<blockquote>
  <p>intro</p>
  <p>more</p>
</blockquote>
```

:::

The list item is the container that always held the gate, and it answers the
band the same way: the marker attaches nothing and the line reaches the item by
its own column, exactly as the comment spelling leaves it.

::: compare

```carve
- intro
+
  more
```

```html
<ul>
  <li>intro
+
more</li>
</ul>
```

:::

The `+` at column 1 matches neither the item's marker column nor the quote's
marker column, so the quoted paragraph folds it in (markup-carve/carve#3421).

::: compare

```carve
- x
  > q
 +
```

```html
<ul>
  <li>x
    <blockquote><p>q
+</p></blockquote>
  </li>
</ul>
```

:::

A word at the same column follows the same ordinary text path.

::: compare

```carve
- x
  > q
 ZZZ
```

```html
<ul>
  <li>x
    <blockquote><p>q
ZZZ</p></blockquote>
  </li>
</ul>
```

:::

The `+` is at the quote's marker column. With no block following it, the
marker adds nothing (markup-carve/carve#3421).

::: compare

```carve
- x
  > q
  +
```

```html
<ul>
  <li>x
    <blockquote><p>q
+</p></blockquote>
  </li>
</ul>
```

:::

A column-0 `+` is the marker for the outer item and adds nothing here because
no flush-left block follows it.

::: compare

```carve
- x
  > q
+
```

```html
<ul>
  <li>x
    <blockquote><p>q
+</p></blockquote>
  </li>
</ul>
```

:::

Past the quote's marker the `+` is quoted content, and text again.

::: compare

```carve
- x
  > q
   +
```

```html
<ul>
  <li>x
    <blockquote><p>q
+</p></blockquote>
  </li>
</ul>
```

:::

The same two columns without the item around them. A top-level quote's marker
sits at column 0, so the marker there attaches the list below it, and one
column right it is text in the quoted paragraph.

::: compare

```carve
> q
 +
- m
```

```html
<blockquote><p>q
+
- m</p></blockquote>
```

:::
