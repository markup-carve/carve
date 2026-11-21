## Escaped hyphen run in a table cell

Escapes keep a literal hyphen run in a table cell from becoming smart punctuation.

::: compare

```carve
|= a |= b |
| \-\-\- | x |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>---</td><td>x</td></tr>
  </tbody>
</table>
```

:::
