---
page: edge-lists
---

## A quoted marker comment keeps source columns

A quote that begins on an item's marker line does not reset the written columns of a block comment run. Both continuation lines pass the opening brace's source column, so the run is invisible (CARVE-P2-035, carve#5787).

::: compare

```carve
- > {% a
  >  b
  >  z %}
```

```html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
```

:::
