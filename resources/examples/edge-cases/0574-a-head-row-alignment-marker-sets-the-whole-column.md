## A head-row alignment marker sets the whole column

CARVE-P12-039 (markup-carve/carve#2978 Q14): a head-row alignment marker sets
the whole column and wins over a delimiter colon. A body-cell marker overrides
only its own cell. Columns without a head marker keep delimiter alignment.

::: compare

```carve
|=> a |= b |
|:-- |:-- |
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">a</th><th scope="col" style="text-align: left;">b</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">1</td><td style="text-align: left;">2</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|=~ a |= b |
|--: |:-- |
| 1 |> 2 |
| 3 | 4 |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: center;">a</th><th scope="col" style="text-align: left;">b</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: center;">1</td><td style="text-align: right;">2</td></tr>
    <tr><td style="text-align: center;">3</td><td style="text-align: left;">4</td></tr>
  </tbody>
</table>
```

:::
