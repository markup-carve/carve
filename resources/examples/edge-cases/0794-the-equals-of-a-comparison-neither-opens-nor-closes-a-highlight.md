## The equals of a comparison neither opens nor closes a highlight

The `=` of `<=` and `>=` is part of the comparison (PART 9 §9, carve#4131): a bare highlight around one keeps the glyph inside, and a comparison alone opens or closes nothing. An arrow such as `<==` keeps its own rule.

::: compare

```carve
=a <= b=
=a >= b=
```

```html
<p><mark>a ≤ b</mark>
<mark>a ≥ b</mark></p>
```

:::

::: compare

```carve
=a>= b
```

```html
<p>=a≥ b</p>
```

:::

::: compare

```carve
=a <= b= and =c=
```

```html
<p><mark>a ≤ b</mark> and <mark>c</mark></p>
```

:::
