---
page: edge-definitions
---

## A heading-shaped line continues an item comment

A continuation past the comment opener is comment text whatever block it spells, so the heading line opens nothing (CARVE-P2-035, carve#5756).

::: compare

```carve
- p
  {% a
   # h
   z %}
```

```html
<ul>
  <li>p
</li>
</ul>
```

:::
