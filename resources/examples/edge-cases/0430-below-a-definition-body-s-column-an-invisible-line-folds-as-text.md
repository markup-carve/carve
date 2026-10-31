## Below a definition body's column an invisible line folds as text

§10 I5 and AN INVISIBLE LINE FOLDS LIKE ANY OTHER both say the same thing about
this band, in their own words: at a nonzero column below the container's content
column an invisible line is lazy paragraph text of that container, and registers
nothing. Corpus 426-4 already pins the plain-line control folding from this
column. Every invisible kind gives the same answer, so the band has one answer
and not one per construct.

A link reference definition folds as characters. The reference elsewhere in the
document stays literal, which is what "registers nothing" costs - half-folding
it, text on the page and a definition in the tables, is not on offer.

::: compare

```carve
:: t
:  d
  [r]: /u
tail

See [text][r].
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
<p>See <a href="/u">text</a>.</p>
```

:::

The footnote spelling is the same answer one construct over, and the same
unresolved reference below it.

::: compare

```carve
:: t
:  d
  [^f]: n
tail

See[^f]
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A block-attribute line is on I5's interrupter list with the definitions and
folds with them. It attaches nothing: the braces are characters in the
description, and the following line folds in behind them exactly as it does
above.

::: compare

```carve
:: t
:  d
  {.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p class="k">tail</p>
```

:::

An abbreviation definition below the body column misses every frame too, so it
ends the description and stands in the document (carve#4412).

::: compare

```carve
:: t
:  d
  *[A]: a
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

A COMMENT IS THE ONE EXCEPTION and is invisible at any column, including this
one. What the line AFTER a comment belongs to is a separate open question about
the comment's own column, recorded in PART 9 §24 and pinned in the list-item
host by corpus 189 and 192, so this row asks only what the comment itself
renders.

::: compare

```carve
:: t
:  d
  %% c
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
```

:::

The band is more than one column wide, and the answer does not move inside it.
One column below the content column reads the same as two.

::: compare

```carve
:: t
:  d
 [r]: /u
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::
