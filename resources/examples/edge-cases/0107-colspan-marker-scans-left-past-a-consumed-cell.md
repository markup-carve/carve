## Colspan marker scans left past a consumed cell

A `<` does NOT reach past a column another cell's rowspan holds. It widens the
cell covering its left neighbor only when that cell starts in the same row;
widening anything else would place one cell on top of another, which is not a
table HTML can hold (carve#3047).

Here the second body row is `| p | ^ | < | e |`. The `^` (column 2) continues the
rowspan of `b` directly above it, so `b` gains `rowspan="2"` and covers column 2
of this row. The `<` (column 3) has `b` as its left neighbor, and `b` started a
row earlier, so the marker is BLOCKED and renders as an empty cell. `p` keeps one
column, and the trailing `e` follows as a plain cell.

::: compare

```carve
| p | q | r | s |
|---|---|---|---|
| a | b | c | d |
| p | ^ | < | e |
```

```html
<table>
  <thead>
    <tr><th scope="col">p</th><th scope="col">q</th><th scope="col">r</th><th scope="col">s</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td rowspan="2">b</td><td>c</td><td>d</td></tr>
    <tr><td>p</td><td></td><td>e</td></tr>
  </tbody>
</table>
```

:::
