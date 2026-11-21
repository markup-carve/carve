## Escape coverage

A backslash escapes any ASCII punctuation character to its literal form. This
pins the full `ascii_punctuation` matrix (`&`, `:`, `;`, `?` included); `<`,
`>`, `&` are then HTML-escaped in the output.

::: compare

```carve
\!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~ done
```

```html
<p>!"#$%&amp;'()*+,-./:;&lt;=&gt;?@[\]^_`{|}~ done</p>
```

:::

A backslash before a non-ASCII character or a letter is literal; `\\` is a
single backslash.

::: compare

```carve
\a and \« and a\\b
```

```html
<p>\a and \« and a\b</p>
```

:::
