## A definition at a container's content column

§10 I5 makes a link or footnote definition an INTERRUPTER, so one written at a
list item's content column ends the paragraph it sits under. Nothing about it
closes the container: the container ends because the next line arrives at column
0 with no open paragraph left to fold into, which is PART 1 S4's own "otherwise"
(markup-carve/carve#1350). And the definition BELONGS to the item at that column,
so it registers.

::: compare

```carve
- a
  [r]: /u
tail

[r][]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

The footnote kind registers the same way, but its body holds the note's own
paragraph. A footnote body takes a lazy line like every container (markup-carve/carve#3885), so `tail` folds into the note:

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
::: compare

```carve
- a
  [^f]: t
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The control is I5's third column, and it is what makes the rule COLUMN-SCOPED
rather than shape-scoped. One space to the left the same line is below the
content column, where it is lazy paragraph text: it registers nothing, it leaves
the paragraph open, and the flush-left line folds. These two documents differ by
a single space and answer differently:

::: compare

```carve
- a
 [r]: /u
tail

[r][]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

An ABBREVIATION definition is not on I5's list and is recognized at document
level only, so at the same content column it is ordinary paragraph text and the
flush-left line folds:

::: compare

```carve
- a
  *[A]: x
tail
```

```html
<ul>
  <li>a
*[A]: x
tail</li>
</ul>
```

:::

A DEFINITION BODY answers exactly as the list item does, which is what keeps S4
doing the work rather than two container-specific rules:

::: compare

```carve
:: t
:  a
   [r]: /u
tail

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

A COMMENT at a definition body's content column is on I5's list too and ends the
paragraph the same way:

::: compare

```carve
:: t
:  a
   %% c
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>tail</p>
```

:::

The FOOTNOTE kind in a definition body is the cell that completes the section.
Every other kind on I5's list is measured in both hosts and the two hosts agree
wherever both were measured, but this one had only ever been measured in the
list item. A rule stated for "a container" and pinned for one of its containers
is the shape a later divergence hides in.

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
::: compare

```carve
:: t
:  a
   [^f]: t
tail

x[^f]
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
