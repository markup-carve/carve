## An abbreviation definition is recognized only at document level

`*[TERM]: expansion` defines an abbreviation only as a direct child of the document. Inside a block quote, a list item or a div the line is ordinary paragraph text: it defines nothing and it is preserved as written. An abbreviation is the only definition kind with no marker at the use site, so a definition carried in quoted material would otherwise rewrite every occurrence of its term in the quoting document.

::: compare

```carve
> *[HTML]: Hyper Text

The HTML spec.
```

```html
<blockquote><p>*[HTML]: Hyper Text</p></blockquote>
<p>The HTML spec.</p>
```

:::
