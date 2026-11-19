---
page: edge-definitions
---

## A quote marker continues a comment

Outside a quote, a `>` on a continuation line is comment text, measured at its own column (CARVE-P2-035, carve#5756).

::: compare

```carve
{% a
 > q
 z %} y
```

```html
<p> y</p>
```

:::
