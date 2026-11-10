---
page: edge-lists
---

## A block-shaped line inside a comment run keeps the item tight

A line inside an open `{%` run is comment payload, even when it is shaped like a list marker or a block opener, so a blank-separated comment-only run is invisible and does not loosen the item (CARVE-P2-035, CARVE-P9-013, carve#5844).

::: compare

```carve
- p

  {% a
   - m
   z %}
```

```html
<ul>
  <li>p</li>
</ul>
```

:::

::: compare

```carve
1. p

   {% a
    # m
    %}
```

```html
<ol>
  <li>p</li>
</ol>
```

:::

::: compare

```carve
> - p
>
>   {% a
>    ---
>    z %}
```

```html
<blockquote>
  <ul>
    <li>p</li>
  </ul>
</blockquote>
```

:::
