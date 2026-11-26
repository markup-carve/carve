---
page: edge-definitions
---

## A closed inline comment holds a brace line

The comment closes later in the paragraph, so the brace line remains text (CARVE-P2-035, carve#5740).

::: compare

```carve
p {% a
{lang=de}
z %} y
```

```html
<p>p  y</p>
```

:::
