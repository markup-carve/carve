## Adjacent slash and underscore emphasis nest

`/` and `_` open immediately after each other when the preceding delimiter is a true opener, so adjacent pairs nest (they only stay literal as path protection when the preceding delimiter is a closer, e.g. `/a/_b_`).

::: compare

```carve
/_x_/ and _/x/_
```

```html
<p><em><u>x</u></em> and <u><em>x</em></u></p>
```

:::
