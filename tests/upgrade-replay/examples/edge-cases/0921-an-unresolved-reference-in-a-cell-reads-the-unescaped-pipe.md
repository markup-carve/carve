---
page: edge-tables
---

## An unresolved reference in a cell reads the unescaped pipe

PART 4 table cells (carve#4718). Cell splitting runs before the inline pass, so the literal source of an unresolved reference in a cell is the cell content after the `\|` unescape, with no backslash left.

:::::: compare

`````carve
| [a\|b][m] |
`````

```html
<table>
  <tbody>
    <tr><td>[a|b][m]</td></tr>
  </tbody>
</table>
```

::::::

An unresolved image reference reads the same.

:::::: compare

`````carve
| ![a\|b][m] |
`````

```html
<table>
  <tbody>
    <tr><td>![a|b][m]</td></tr>
  </tbody>
</table>
```

::::::

A label written with `\|` in a cell matches a definition spelled with a plain pipe.

:::::: compare

`````carve
| [x][r\|s] |

[r|s]: /u
`````

```html
<table>
  <tbody>
    <tr><td><a href="/u">x</a></td></tr>
  </tbody>
</table>
```

::::::
