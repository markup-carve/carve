---
page: edge-lists
---

## A braced comment paragraph with text misses the item

A line holding only a braced comment is a paragraph, not an erased line. When its continuation shows text, that paragraph is visible and S2 places it by its own column: below the item it closes the item, and a list marker under it stays paragraph text (CARVE-P9-042, CARVE-P0-005, carve#5837).

::: compare

```carve
- a

{%%}
  z
```

```html
<ul>
  <li>a</li>
</ul>
<p>
z</p>
```

:::

::: compare

```carve
> - a
>
> {% c %}
>   z
```

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
  <p>
z</p>
</blockquote>
```

:::

::: compare

```carve
- a

{%%}
  - b
```

```html
<ul>
  <li>a</li>
</ul>
<p>
- b</p>
```

:::
