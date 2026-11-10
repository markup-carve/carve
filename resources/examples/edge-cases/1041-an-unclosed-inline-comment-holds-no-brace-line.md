---
page: edge-definitions
---

## An unclosed inline comment holds no brace line

The unmatched comment opener is literal text, so the later brace line opens a block attribute (PART 9 §21a, CARVE-P2-035, carve#5740).

::: compare

```carve
{%%%:fr}
y
{.x}
z
```

```html
<p>{%%%:fr}
y</p>
<p class="x">z</p>
```

:::
