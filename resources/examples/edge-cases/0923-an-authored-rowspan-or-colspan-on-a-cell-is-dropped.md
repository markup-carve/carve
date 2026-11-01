---
page: edge-tables
---

## An authored rowspan or colspan on a cell is dropped

PART 4 cell attributes (carve#4715). Only the `^` and `<` span markers shape the grid, so an authored `rowspan` or `colspan` on a cell is always dropped, whether or not a span is computed.

:::::: compare

`````carve
|{rowspan=2} a | b |
| c | d |
`````

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

::::::

Beside a computed span, the authored key is dropped too and the other attributes stay.

:::::: compare

`````carve
|{colspan=3 .k} a | b |
| ^ | d |
`````

```html
<table>
  <tbody>
    <tr><td rowspan="2" class="k">a</td><td>b</td></tr>
    <tr><td>d</td></tr>
  </tbody>
</table>
```

::::::

An authored `align` follows PART 10 like any other key and stays beside the computed alignment.

:::::: compare

`````carve
|>{align=left} a |
`````

```html
<table>
  <tbody>
    <tr><td align="left" style="text-align: right;">a</td></tr>
  </tbody>
</table>
```

::::::
