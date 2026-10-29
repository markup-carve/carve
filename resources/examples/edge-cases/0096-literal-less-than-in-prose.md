## Literal less-than in prose

A `<` that is neither an autolink, a crossref, nor a smart-typography arrow stays literal text (HTML-escaped on output).

::: compare

```carve
Check if (x < 5) holds, and 3<4 too.
```

```html
<p>Check if (x &lt; 5) holds, and 3&lt;4 too.</p>
```

:::
