## Abbreviation definition interrupts a paragraph

An abbreviation definition is an invisible construct (§10): on the line directly after prose it is consumed and applied, with no blank line needed.

::: compare

```carve
The HTML spec is long.
*[HTML]: HyperText Markup Language
```

```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec is long.</p>
```

:::
