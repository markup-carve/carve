## An empty abbreviation term is not a definition

`abbreviation_term = (letter | digit)+` needs at least one character, so `*[]:` opens nothing and the line stays paragraph text.

::: compare

```carve
*[]: expansion

Text.
```

```html
<p>*[]: expansion</p>
<p>Text.</p>
```

:::
