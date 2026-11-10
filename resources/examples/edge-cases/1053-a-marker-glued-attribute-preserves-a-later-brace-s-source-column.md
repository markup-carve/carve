---
page: edge-attributes
---

## A marker-glued attribute preserves a later brace's source column

The marker-glued metadata does not move the item's content column, but it occupies written columns before the next brace. A continuation at or left of that brace refuses the run (CARVE-P2-035, CARVE-P9-083, carve#5788).

::: compare

```carve
-{.x} {.x
     .y}
  # h
```

```html
<ul>
  <li class="x">{.x
.y}
# h</li>
</ul>
```

:::
