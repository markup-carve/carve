## Invalid table metadata keeps the table

:::: compare

```carve
{header-rows=2 footer-rows=1}
| a | b |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
{footer-rows=>}
| a | b |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
{aligns=right,left,center}
| a | b |
```

```html
<table>
  <tbody>
    <tr><td style="text-align: right;">a</td><td style="text-align: left;">b</td></tr>
  </tbody>
</table>
```

::::
