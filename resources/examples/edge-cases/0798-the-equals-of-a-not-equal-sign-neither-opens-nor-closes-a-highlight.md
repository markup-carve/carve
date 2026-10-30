---
page: edge-inline
---

## The equals of a not-equal sign neither opens nor closes a highlight

`!=` is a comparison like `<=` and `>=` (PART 9 §9, carve#4177): its `=` is part of the symbol, so a bare highlight around it keeps the glyph inside, and the comparison alone opens or closes nothing. In `!==` the `!=` is read first, so the extra `=` closes the highlight.

::: compare

```carve
=a != b=
```

```html
<p><mark>a ≠ b</mark></p>
```

:::

::: compare

```carve
=a!= b
```

```html
<p>=a≠ b</p>
```

:::

::: compare

```carve
=a != b= and =c=
```

```html
<p><mark>a ≠ b</mark> and <mark>c</mark></p>
```

:::

::: compare

```carve
=a !== b=
```

```html
<p><mark>a ≠</mark> b=</p>
```

:::
