## A table foot span keeps one row group

A body cell spanning into a footer row uses the same single-body layout.

::: compare

```carve
{footer-rows=1}
| a | b |
| ^ | c |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

:::
