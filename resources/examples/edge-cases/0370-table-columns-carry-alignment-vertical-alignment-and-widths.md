## Table columns carry alignment, vertical alignment and widths

A preceding table attribute line supplies positional column defaults even when
the table has no header row. Empty entries are unset. Source widths are
percentages; the exchange AST stores the corresponding fractions. Cell-local
markers remain more specific than these defaults.

::: compare

```carve
{aligns="right,,center" valigns="top,middle,bottom" widths="25,50,25"}
| A | B | C |
| D | E | F |
```

```html
<table>
  <colgroup>
    <col style="width: 25%;">
    <col style="width: 50%;">
    <col style="width: 25%;">
  </colgroup>
  <tbody>
    <tr><td style="text-align: right; vertical-align: top;">A</td><td style="vertical-align: middle;">B</td><td style="text-align: center; vertical-align: bottom;">C</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">D</td><td style="vertical-align: middle;">E</td><td style="text-align: center; vertical-align: bottom;">F</td></tr>
  </tbody>
</table>
```

:::
