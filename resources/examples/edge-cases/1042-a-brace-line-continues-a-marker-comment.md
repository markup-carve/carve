---
page: edge-definitions
---

## A brace line continues a marker comment

A brace-shaped continuation is still comment content when its source column passes the comment opener (CARVE-P2-035, carve#5756).

::: compare

```carve
- {% a
   {lang=de}
   z %} y
```

```html
<ul>
  <li> y</li>
</ul>
```

:::
