---
page: edge-lists
---

## A comment continuation past the brace after an outer quote prefix is hidden

With the outer indentation reversed, the continuation stands past the opening brace after its quote prefix, so the run is a comment (CARVE-P2-035, carve#5787).

::: compare

```carve
  > - {% a
>    b %}
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
```

:::
