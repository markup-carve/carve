---
page: edge-lists
---

## An attribute run after a lone plus leads a sublist at the content column

The maintainer overruled this row's title (carve#4278): a list does not attach to a list item (CARVE-P9-067), and an attribute line changes nothing about that, so the sibling test reads the block the run leads. The `+` is a letter that continues the paragraph, and the attribute line ends the item and labels the list outside it (carve#4278, carve#4447). A sublist is written with an indented attribute line.

::: compare

```carve
- a
+
{x}
  - c
```

```html
<ul>
  <li>a
+</li>
</ul>
<ul x="">
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- a
+
{x
y}
  - c
```

```html
<ul>
  <li>a
+</li>
</ul>
<ul x="" y="">
  <li>c</li>
</ul>
```

:::

The same holds inside a quote.

::: compare

```carve
> - a
> +
> {x}
>   - c
```

```html
<blockquote>
  <ul>
    <li>a
+</li>
  </ul>
  <ul x="">
    <li>c</li>
  </ul>
</blockquote>
```

:::
