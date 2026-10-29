## An explicit table head span keeps one row group

When a header cell spans into a body row, the table uses one `<tbody>` and
keeps the cell's header scope.

::: compare

```carve
{header-rows=1}
| H | G |
| ^ | b |
```

```html
<table>
  <tbody>
    <tr><th scope="col" rowspan="2">H</th><th scope="col">G</th></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::
