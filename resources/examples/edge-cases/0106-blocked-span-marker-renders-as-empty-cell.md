## Blocked span marker renders as empty cell

A span marker merges into the nearest still-available origin: a `^` walks up its
column, a `<` walks left along its row, skipping cells already consumed by another
span. When the walk reaches no available cell at all - it runs off the edge of the
table - the marker is neither dropped nor left literal: it renders as an EMPTY cell
(`<td></td>`) carrying no content and no span. The first-row `^` / first-column `<`
orphan is one instance (see "Table span marker in first column"); the same rule
covers a marker BLOCKED when every cell back to the edge is already consumed.

Here the second body row leads with `^`, so the `x` above it gains `rowspan="2"`.
The next cell is `<`; its only left neighbor (the first column) is now occupied by
that rowspan, so the leftward walk runs off the edge with nothing to merge and the
`<` becomes an empty cell. The trailing `d` follows as usual.

::: compare

```carve
| A | B | C |
|---|---|---|
| x | y | z |
| ^ | < | d |
```

```html
<table>
  <thead>
    <tr><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="2">x</td><td>y</td><td>z</td></tr>
    <tr><td></td><td>d</td></tr>
  </tbody>
</table>
```

:::
