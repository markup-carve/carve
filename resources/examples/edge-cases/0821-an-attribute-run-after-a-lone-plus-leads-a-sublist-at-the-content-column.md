---
page: edge-lists
---

## An attribute run after a lone plus leads a sublist at the content column

After a lone `+`, an attribute line leads the attached block and changes nothing about where that block goes (CARVE-P0-008, corpus 325). A sublist at the item's content column is that block, so it stays in the item and takes the attributes, in the one-line and the wrapped spelling alike (carve#4278).

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
    <ul x="">
      <li>c</li>
    </ul>
  </li>
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
    <ul x="" y="">
      <li>c</li>
    </ul>
  </li>
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
      <ul x="">
        <li>c</li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::
