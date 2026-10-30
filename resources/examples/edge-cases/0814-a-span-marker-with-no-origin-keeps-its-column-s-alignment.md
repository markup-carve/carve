---
page: edge-tables
---

## A span marker with no origin keeps its column's alignment

A span marker with no origin renders as an empty cell (CARVE-P9-002). It loses
its content and its span, not its column: a delimiter row's alignment applies
to the whole column (CARVE-P9-004), so the empty cell carries it too
(markup-carve/carve#4277).

::: compare

```carve
| a | b |
|-:|:-:|
| < | c |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">a</th><th scope="col" style="text-align: center;">b</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;"></td><td style="text-align: center;">c</td></tr>
  </tbody>
</table>
```

:::

The same holds for an orphan `^` in the head row and for a column a head-row
marker aligns.

::: compare

```carve
| ^ |=> b |
|-:|---|
| c | d |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;"></th><th scope="col" style="text-align: right;">b</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">c</td><td style="text-align: right;">d</td></tr>
  </tbody>
</table>
```

:::
