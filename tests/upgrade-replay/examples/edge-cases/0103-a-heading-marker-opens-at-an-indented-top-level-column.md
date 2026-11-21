## A heading marker opens at an indented top-level column

An indented `#`-line opens a heading at top level (carve#3885). Within a container the column is measured after the container markers, so `> # H` is a quoted heading.

::: compare

```carve
   # H
```

```html
<section id="H">
  <h1>H</h1>
</section>
```

:::

An indented marker with more hashes opens a heading of that level.

::: compare

```carve
  ## H
```

```html
<section id="H">
  <h2>H</h2>
</section>
```

:::
