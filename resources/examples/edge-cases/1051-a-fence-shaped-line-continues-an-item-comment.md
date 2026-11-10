---
page: edge-definitions
---

## A fence-shaped line continues an item comment

The fence-shaped continuation opens no code block, so the paragraph stays open and the lazy line continues it (CARVE-P2-035, carve#5756).

::: compare

````carve
- {% a
   ```
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
