## Table cell attributes

A `{…}` attribute block glued to a cell (no space) sets that cell's attributes;
the rest, after optional whitespace, is the cell content. A space before the
brace keeps it literal, and a cell carrying attributes is never a bare span
marker. The block binds after the cell's kind and alignment markers, so on a
cell with no marker it sits directly against the opening `|`.

::: compare

```carve
|{.highlight} Total | 99 |
|---|---|
| a | b |
```

```html
<table>
  <thead>
    <tr><th scope="col" class="highlight">Total</th><th scope="col">99</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::
