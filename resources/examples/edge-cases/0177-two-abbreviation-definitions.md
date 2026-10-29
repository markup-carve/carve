## Two abbreviation definitions

Nothing about the second definition is special - it is here because a document
with TWO of them is what tells the engines apart. The HTML says nothing about
how the definitions were spelled, so a formatter that joined them differently
stayed invisible until the canonical-Carve target was compared across engines
(carve-php#682).

::: compare

```carve
*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

HTML and CSS.
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> and <abbr title="Cascading Style Sheets">CSS</abbr>.</p>
```

:::
