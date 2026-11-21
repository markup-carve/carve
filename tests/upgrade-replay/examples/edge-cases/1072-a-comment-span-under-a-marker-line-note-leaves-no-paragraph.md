---
page: edge-lists
---

## A comment span under a marker-line note leaves no paragraph

A comment fence at an item's content column, below the body of a note written on the item's marker line, opens its span in the item: the comment closes no frame, so its span belongs to the deepest frame the line reaches. Its payload line opens no paragraph, and an unmarked line after it does not continue the quote lazily (PART 0 S1, S4, carve#5878). One quote level deeper, a text line left of a nested span's fence ends that span as it does at the quote's own level, so a lazy line continues the paragraph it opens.

::: compare

```carve
> - [^n]: {% a
>   %%%
>   z %}
plain

x[^n]
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>plain</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>{% a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> - [^n]: a
>   %%%
>   z
plain

x[^n]
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>plain</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> :: t
> : [^n]: a
>   %%%
>   z
plain

x[^n]
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd></dd>
  </dl>
</blockquote>
<p>plain</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> > - [^n]: a
> >   %%%
> > z
plain

x[^n]
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
    <p>z
plain</p>
  </blockquote>
</blockquote>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
