---
page: edge-tables
---

## A delimited body's overlapping header and footer make no header cells

PART 9 §5 (carve#4640). An explicit `header-rows` and `footer-rows` that overlap on a delimited body are invalid under the ordinary partition rule, so no row is a header cell, as on a pipe table. A `^` in the row above a continuation counts as a data cell for the header test, so the appended cell is a data cell.

:::::: compare

`````carve
{table header-rows=2 footer-rows=1}
```csv
a
b
```
`````

`````html
<table>
  <tbody>
    <tr><td>a</td></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
`````

::::::

:::::: compare

`````carve
|= a |
| ^  |
+ | c |
`````

`````html
<table>
  <tbody>
    <tr><th scope="col" rowspan="2">a</th></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
`````

::::::
