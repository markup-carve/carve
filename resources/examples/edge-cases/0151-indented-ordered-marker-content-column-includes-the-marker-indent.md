## Indented ordered marker content column includes the marker indent

The content column of a list item includes the marker's own leading indentation (PART 9 §24 C3): `    1. ` is base column 4 plus marker width 3, so its content column is 7. A block opener dedented below that column but not to column 0 is *lazy* text, not a new block. A `| x |` table row at column 2 therefore folds into the item as lazy paragraph text instead of ending the item and escaping the row to a document-level table.

::: compare

```carve
    1. y
  | x |
```

```html
<ol>
  <li>y</li>
</ol>
<table>
  <tbody>
    <tr><td>x</td></tr>
  </tbody>
</table>
```

:::
