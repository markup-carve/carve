---
page: edge-footnotes
---

## An unprefixed line does not reach a quoted note's first block

A line reaches a note inside a quote only through the quote's prefix (CARVE-P9-067, carve#4097). An unprefixed follower refuses the note's `+`, which stays text, and closes the quote; a paragraph line folds into that text. A prefixed follower at the note's marker column is the note's block.

::: compare

```carve
> [^b]: +
# H

r[^b]
```

```html
<blockquote>

</blockquote>
<section id="H">
  <h1>H</h1>
  <p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> [^b]: +
> # H

r[^b]
```

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- > [^b]: +
para

r[^b]
```

```html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
> - x
>   [^b]: +
```
c
```

r[^b]
````

```html
<blockquote>
  <ul>
    <li>x</li>
  </ul>
</blockquote>
<pre><code>c
</code></pre>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

:::: compare

```carve
> > [^b]: +
::: d
x
:::

r[^b]
```

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<div class="d">
  <p>x</p>
</div>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

::: compare

```carve
> [^b]: +
para

r[^b]
```

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> [^b]: +
>   flush

r[^b]
```

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
