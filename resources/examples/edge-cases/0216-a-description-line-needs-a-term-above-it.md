## A `:` description line needs a term above it

A definition list is a term plus its descriptions, so a `:` line with no term above it opens nothing - the line is ordinary paragraph text, and anything on it stays text too.

::: compare

```carve
:  [r]: /u

see [t][r]
```

```html
<p>:  [r]: /u</p>
<p>see [t][r]</p>
```

:::
