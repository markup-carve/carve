## A table delimiter cell needs at least one dash

A lone `:` does not make a delimiter row, so the row is an ordinary body row and the table gets no header.

::: compare

```carve
| a | b |
|:|:|
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>:</td><td>:</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::
