## Footnote references take an attribute run, editorial substitution and comment take none

A footnote reference and an inline note are inline elements with an attribute
slot, so a glued run of blocks merges onto the note reference like any other
(§15 A3).

::: compare

```carve
a[^n]{.k}{.j} b

[^n]: x
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref" class="k j"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a^[x]{.k}{.j} b
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref" class="k j"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Editorial substitution and editorial comment have no attribute slot, so a
block after either one is text.

::: compare

```carve
{~a~>b~}{.k} c

{#note#}{.k} c
```

```html
<p><del>a</del><ins>b</ins>{.k} c</p>
<p><span class="critic-comment">note</span>{.k} c</p>
```

:::
