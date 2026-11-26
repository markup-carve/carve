## Table row closing pipe

A table row must close with a pipe. A line that starts with `|` but has content dangling after its last pipe is prose, wherever it appears - it neither opens a table at a block start nor interrupts an open paragraph.

::: compare

```carve
| a | b
```

```html
<p>| a | b</p>
```

:::

The rule applies to every row, not only the first: once a line fails to close, the table ends and that line is a paragraph.

::: compare

```carve
| a | b |
| c | d
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p>| c | d</p>
```

:::

And an unclosed line does not swallow a following well-formed row: the row still opens its own table.

::: compare

```carve
| a
| b |
```

```html
<p>| a</p>
<table>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::
