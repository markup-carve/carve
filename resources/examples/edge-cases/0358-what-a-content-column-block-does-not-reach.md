## What a content-column block does not reach

A comment at the content column closes the item's paragraph and retains
nothing (`CARVE-P0-009` X1, `CARVE-P9-053`). The following below-column line
opens a document paragraph:

::: compare

```carve
- a
  %% c
 b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::

And a line AT the content column after the block is the item's own second
paragraph, which it was before:

::: compare

```carve
- a
  [^f]: t
    more
  b

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
more
b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
