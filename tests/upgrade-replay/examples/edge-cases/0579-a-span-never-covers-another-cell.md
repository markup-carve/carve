## A span never covers another cell

A marker grows the cell covering its neighbor only when the new cells it would take
are free (CARVE-P9-002). A `^` under a cell two columns wide takes the whole
two-column strip of its row, so the strip must hold span markers or nothing. In the
last row the `^` under `spans 4 cells` takes the `<` beside it, which renders
nothing, and the row owns no cell of its own.

::: compare

```carve
|= 2-col header|<|= header|
|spans 3 rows|foo|bar|
|^|spans 4 cells|<|
|^|^|<|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2">2-col header</th><th scope="col">header</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="3">spans 3 rows</td><td>foo</td><td>bar</td></tr>
    <tr><td rowspan="2" colspan="2">spans 4 cells</td></tr>
    <tr></tr>
  </tbody>
</table>
```

:::

When the strip holds a cell, the `^` is blocked and renders as an empty cell, so
`a` keeps one row and `b` keeps its place.

::: compare

```carve
| a | < |
| ^ | b |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
    <tr><td></td><td>b</td></tr>
  </tbody>
</table>
```

:::

A header row is a row in which every cell it owns is a header cell. A span
placeholder belongs to the cell covering it, so a `<` beside a `|=` cell keeps the
row in `<thead>` (CARVE-P9-006).

::: compare

```carve
|= a |<|= b |
| 1 | 2 | 3 |
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td><td>3</td></tr>
  </tbody>
</table>
```

:::
