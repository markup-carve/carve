## Table row attributes

An attribute block glued to a row's closing `|` sets that row's `<tr>`
attributes - the row-level twin of a cell's attribute block, in a different
position: a row's follows the row's last `|`, a cell's follows the cell's
markers. It applies to a header or a body row and composes with the GFM
delimiter row.

::: compare

```carve
| Name | Score |{.head}
|------|-------|
| Ann  | 9     |{.win}
```

```html
<table>
  <thead>
    <tr class="head"><th scope="col">Name</th><th scope="col">Score</th></tr>
  </thead>
  <tbody>
    <tr class="win"><td>Ann</td><td>9</td></tr>
  </tbody>
</table>
```

:::
