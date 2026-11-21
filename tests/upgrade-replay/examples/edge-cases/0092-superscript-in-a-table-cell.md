## Superscript in a table cell

Superscript in a cell uses the braced form `{^…^}`. A *lone* `^` as the sole
cell content is a rowspan marker; any other bare `^` in a cell is literal text.

::: compare

```carve
| Value |
| {^2^} |
```

```html
<table>
  <tbody>
    <tr><td>Value</td></tr>
    <tr><td><sup>2</sup></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| Value |
| ^2^   |
```

```html
<table>
  <tbody>
    <tr><td>Value</td></tr>
    <tr><td>^2^</td></tr>
  </tbody>
</table>
```

:::
