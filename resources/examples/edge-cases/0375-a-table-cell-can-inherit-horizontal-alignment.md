## A table cell can inherit horizontal alignment

`?` in the horizontal position preserves the column's horizontal alignment
while supplying a cell-level vertical alignment. It is valid only as the first
marker of `?^`, `?~`, or `?v`; every other use stays visible content.

::: compare

```carve
|=>^ Name |= Value |
|?v Bottom |?~ Middle |
|?^ Top | plain |
|? lone |v? reversed |
|?< wrong |^< axes |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right; vertical-align: top;">Name</th><th scope="col">Value</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right; vertical-align: bottom;">Bottom</td><td style="vertical-align: middle;">Middle</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">Top</td><td>plain</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">? lone</td><td>v? reversed</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">?&lt; wrong</td><td>^&lt; axes</td></tr>
  </tbody>
</table>
```

:::
