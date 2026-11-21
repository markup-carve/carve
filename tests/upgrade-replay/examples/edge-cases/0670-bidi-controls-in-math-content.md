## Bidi controls in math content

Math content drops bidi override and isolate controls under PART 9 §26. These two inputs use different controls and different surrounding text.

<!-- The math body contains a, RIGHT-TO-LEFT OVERRIDE (U+202E), b. -->
::: compare no-render

```carve
$`a‮b`
```

```html
<p><span class="math inline" role="math">\(ab\)</span></p>
```

:::

<!-- The math body contains x, LEFT-TO-RIGHT ISOLATE (U+2066), y. -->
::: compare no-render

```carve
$`x⁦y`
```

```html
<p><span class="math inline" role="math">\(xy\)</span></p>
```

:::
