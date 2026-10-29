## A hard break in a pipe-table cell survives Markdown export

A terminal hard break in a table cell uses `<br>` in Markdown because a newline would end the row.

:::: compare

```carve
| a\ | b |
```

```html
<table>
  <tbody>
    <tr><td>a<br>
</td><td>b</td></tr>
  </tbody>
</table>
```

::::
