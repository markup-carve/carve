## Table header cell rowspan

A `^` rowspan marker extends the cell above it even across the header/body
boundary: a header cell can span into the body rows below, rendering as
`<th scope="col" rowspan="N">`.

::: compare

```carve
|= H |= G |
| ^ | b |
| ^ | c |
```

```html
<table>
  <tbody>
    <tr><th scope="col" rowspan="3">H</th><th scope="col">G</th></tr>
    <tr><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

:::
