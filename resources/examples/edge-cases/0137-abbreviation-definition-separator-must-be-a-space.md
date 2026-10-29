## Abbreviation definition separator must be a space

Abbreviation definitions follow the rule too: `*[label]:` must be followed by a literal space. A tab keeps the line as a paragraph and no abbreviation is registered.

::: compare

```carve
*[HTML]:	Hyper

The HTML
```

```html
<p>*[HTML]:	Hyper</p>
<p>The HTML</p>
```

:::
