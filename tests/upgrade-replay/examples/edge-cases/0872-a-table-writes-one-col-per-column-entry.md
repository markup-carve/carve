---
page: edge-tables
---

## A table writes one col per column entry

A table's column entries run to the longest of its `aligns`, `valigns` and `widths` lists, capped at the column count, and `widths` writes one `col` per entry. An `aligns` list longer than `widths` adds bare `col` elements up to its own length (CARVE-P12-039, markup-carve/carve#4608).

::: compare

```carve
{aligns=left,right,center widths=25}
| a | b | c |
```

```html
<table>
  <colgroup>
    <col style="width: 25%;">
    <col>
    <col>
  </colgroup>
  <tbody>
    <tr><td style="text-align: left;">a</td><td style="text-align: right;">b</td><td style="text-align: center;">c</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
{valigns=top,bottom widths=40}
| a | b | c |
```

```html
<table>
  <colgroup>
    <col style="width: 40%;">
    <col>
  </colgroup>
  <tbody>
    <tr><td style="vertical-align: top;">a</td><td style="vertical-align: bottom;">b</td><td>c</td></tr>
  </tbody>
</table>
```

:::
