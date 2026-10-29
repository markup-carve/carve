## Heading marker column zero

A heading marker must sit at column 0; an indented `#`-line is paragraph text — carve does not accept CommonMark's 0-3 space indent. (Within a container the column is measured after the container markers, so `> # H` is still a quoted heading.)

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

An indented marker with more hashes is likewise paragraph text, not a heading.

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
