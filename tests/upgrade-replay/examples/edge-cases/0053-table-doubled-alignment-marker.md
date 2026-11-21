## Table doubled alignment marker

An alignment run is accepted as a unit. A duplicate horizontal axis makes the
whole run invalid, so `|=<<` keeps both `<` characters as visible content rather
than consuming a valid prefix. The kind marker falls with it: T11's run is
atomic, and with no space to end it the `=` is content too, so the cell is an
ordinary data cell whose text begins with `=<<`. The second cell, spelled with
its space, is still a header -- and one header cell among data cells is a row
header rather than a `thead`.

::: compare

```carve
|=<< Note |= Plain |
| a         | b       |
```

```html
<table>
  <tbody>
    <tr><td>=&lt;&lt; Note</td><th scope="row">Plain</th></tr>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::
