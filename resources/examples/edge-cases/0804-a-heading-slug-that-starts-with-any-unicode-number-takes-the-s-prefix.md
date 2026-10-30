---
page: edge-headings
---

## A heading slug that starts with any Unicode number takes the s- prefix

A generated heading id whose first character is of general category N, not only an ASCII digit, is prefixed `s-` (CARVE-P2-004, carve#4157).

::: compare

```carve
# ²super

# ١٢٣ heading
```

```html
<section id="s-²super">
  <h1>²super</h1>
</section>
<section id="s-١٢٣-heading">
  <h1>١٢٣ heading</h1>
</section>
```

:::

::: compare

```carve
# 1st

# x²
```

```html
<section id="s-1st">
  <h1>1st</h1>
</section>
<section id="x²">
  <h1>x²</h1>
</section>
```

:::
