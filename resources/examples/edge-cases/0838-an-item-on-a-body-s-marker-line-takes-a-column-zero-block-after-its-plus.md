---
page: edge-lists
---

## An item on a body's marker line takes a column-zero block after its plus

A list item on a description's or note's marker line is a marker body like any other. Its first-block `+` takes a follower at the item's marker column. A line at column zero refuses it and folds into the `+` (CARVE-P9-067, carve#4409).

::: compare

```carve
:: t
: - +
p
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>+
p</li>
    </ul>
  </dd>
</dl>
```

:::

The note reads the same way.

::: compare

```carve
[^n]: - +
p

r[^n]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>+
p</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
