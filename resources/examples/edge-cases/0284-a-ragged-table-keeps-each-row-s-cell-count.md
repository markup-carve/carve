## A ragged table keeps each row's cell count

Cell count is content, not source padding. The canonical writer can align the
cells a row carries, but it does not append empty cells to make the table
rectangular. A missing trailing cell and an authored empty cell render as
different table structures.

::: compare

```carve
| ~x~ |
| a | b |
```

```html
<table>
  <tbody>
    <tr><td><s>x</s></td></tr>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

The same rule applies when the first row is a header. A short body row stays
short, and the canonical native `=` spelling does not need a delimiter row.

::: compare

```carve
| |x |
|---|
| y |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col">x</th></tr>
  </thead>
  <tbody>
    <tr><td>y</td></tr>
  </tbody>
</table>
```

:::

A header row may itself be shorter than a later body row. Its native markers
still preserve it as a header without manufacturing another header cell.

::: compare

```carve
| h |
|---|
| |x |
```

```html
<table>
  <thead>
    <tr><th scope="col">h</th></tr>
  </thead>
  <tbody>
    <tr><td></td><td>x</td></tr>
  </tbody>
</table>
```

:::
