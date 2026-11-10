---
page: edge-lists
---

## A comment-only braced paragraph after a blank closes the item it misses

A paragraph holding only braced comments renders nothing, but it is still a paragraph, not an erased line. After a blank, S2 places it by its column, so below the item's content column it closes the item (CARVE-P9-042, CARVE-P0-005, carve#5850).

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
<p>z</p>
```

:::

Between two content columns it closes only the deeper item. The next marker then joins the nested list, because the comment paragraph separates nothing in a list (CARVE-P9-013).

::: compare

```carve
- a
  - b

   {%%}
    - b
```

```html
<ul>
  <li>a
    <ul>
      <li><p>b</p></li>
      <li><p>b</p></li>
    </ul>
  </li>
</ul>
```

:::

At the item's content column it stays in the item.

::: compare

```carve
- a

  {%%}

  z
```

```html
<ul>
  <li><p>a</p>
    <p>z</p>
  </li>
</ul>
```

:::
