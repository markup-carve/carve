---
page: edge-definitions
---

## A marker that misses a description folds into its item


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

A marker at column 0 reaches no frame of the description (PART 0 S2), so it is a lazy line of the item's open paragraph, as it is one column right.

::: compare

```carve
:: t
: - a
- b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>b</li>
</ul>
```

:::

::: compare

```carve
:: t
: 1. a
2. b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>a</li>
    </ol>
  </dd>
</dl>
<ol start="2">
  <li>b</li>
</ol>
```

:::

A blank line ends the description first.

::: compare

```carve
:: t
: - a

- b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>b</li>
</ul>
```

:::
