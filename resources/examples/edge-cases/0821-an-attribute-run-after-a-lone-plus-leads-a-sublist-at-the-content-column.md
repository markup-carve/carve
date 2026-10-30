---
page: edge-lists
---

## An attribute run after a lone plus leads a sublist at the content column

The maintainer overruled this row's title (carve#4278, carve#4449): an attribute line is invisible, so the `+` test reads the line after it (CARVE-P9-067). That line stands at the content column, so the `+` is refused and shows as a letter, and the attribute line labels the list outside the item.

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
