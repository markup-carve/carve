## A pipe pair with no cell is not a table

This section's name records the reading markup-carve/carve#2879 replaced; the
corpus numbering is append-only, so it keeps its name. `||` has one cell slot
between its two pipes, and an empty slot is a cell: the line is a one-row table
with one empty data cell (PART 9 §5 T2). The section "An explicitly delimited
row of blank cells is a table" carries the full rule.

::: compare

```carve
||
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::
