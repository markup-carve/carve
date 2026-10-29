## A table alignment run carries two independent axes

The horizontal marker comes first and the optional vertical marker follows it.
Rendered CSS likewise writes
`text-align` before `vertical-align`. A head-row header-cell run supplies column
defaults; a later row-header run or a body-cell run overrides only that cell.

::: compare

```carve
|=~ Item |=>^ Qty |
| Apple | 12 |
| Subtotal |<v 12 |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: center;">Item</th><th scope="col" style="text-align: right; vertical-align: top;">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: center;">Apple</td><td style="text-align: right; vertical-align: top;">12</td></tr>
    <tr><td style="text-align: center;">Subtotal</td><td style="text-align: left; vertical-align: bottom;">12</td></tr>
  </tbody>
</table>
```

:::
