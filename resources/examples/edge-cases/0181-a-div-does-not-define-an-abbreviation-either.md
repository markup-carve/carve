## A div does not define an abbreviation either

The rule names three containers - a block quote, a list item and a div - and the first two were pinned while the third was not. A div is the one of the three that renders its children unchanged, so a definition inside it is the case where the line looks most like a document-level one, and the use below it still gets no `<abbr>`.

::::: compare

```carve
:::
*[HTML]: Hyper Text

The HTML spec.
:::
```

```html
<div>
  <p>*[HTML]: Hyper Text</p>
  <p>The HTML spec.</p>
</div>
```

:::::
