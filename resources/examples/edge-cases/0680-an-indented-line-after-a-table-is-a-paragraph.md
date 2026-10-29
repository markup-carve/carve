## An indented line after a table is a paragraph

A body row must start at the table base.

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
