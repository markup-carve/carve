---
page: edge-definitions
---

## A fence-shaped line continues an item comment

The escaped backtick run stays inside the item comment, so no code block opens and the lazy line continues the paragraph (CARVE-P2-035, carve#5756).

::: compare

````carve
- {% a
   \```
   z %}
plain
````

```html
<ul>
  <li>
plain</li>
</ul>
```

:::
