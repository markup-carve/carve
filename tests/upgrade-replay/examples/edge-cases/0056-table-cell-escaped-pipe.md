## Table cell escaped pipe

A backslash-escaped pipe is literal content and does not split the
cell.

::: compare

```carve
|= A |= B |
| x \| y | z |
```

```html
<table>
  <thead>
    <tr><th scope="col">A</th><th scope="col">B</th></tr>
  </thead>
  <tbody>
    <tr><td>x | y</td><td>z</td></tr>
  </tbody>
</table>
```

:::
