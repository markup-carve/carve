---
page: edge-inline
---

## A braced comment before a flag opener counts as nothing

CARVE-P3-021 (carve#4813, carve#4719). An opening `(`, `"` or `'` at the start of the inline content counts as whitespace for the flag test, and a braced comment in front of it counts as nothing, so the run stays literal as it does without the comment.

::: compare

```carve
{%c%}(--force) y
```

```html
<p>(--force) y</p>
```

:::

A range and a doubled parenthesis still convert.

::: compare

```carve
{%c%}(1--10) and {%c%}((--x))
```

```html
<p>(1–10) and ((–x))</p>
```

:::
