## An indented row after a table continues it

A body row indented past the table base still continues the table.

::: compare

```carve
|a|
|---|
|b|
 |c|
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th></tr>
  </thead>
  <tbody>
    <tr><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

:::
