---
page: edge-attributes
---

## A refused root run releases a heading

The closer does not pass the opening brace column. The opener is literal and the heading opens normally (CARVE-P2-035, carve#5830).

::: compare

```carve
{.x
.y}
# H
```

```html
<p>{.x
.y}</p>
<section id="H">
  <h1>H</h1>
</section>
```

:::
