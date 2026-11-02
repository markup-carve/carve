## A div does not define an abbreviation either

A div reads the line as a block quote and a list item do: it defines, and the use below it gets an `<abbr>`. The section title names the reading carve#4865 replaced and stays as the corpus id.

::::: compare

```carve
:::
*[HTML]: Hyper Text

The HTML spec.
:::
```

```html
<div>
  <p>The <abbr title="Hyper Text">HTML</abbr> spec.</p>
</div>
```

:::::
