## A head and foot consuming all rows leave no implicit body

:::: compare

```carve
{header-rows=1 footer-rows=1}
| H | G |
| F | T |
```

```html
<table>
  <thead>
    <tr><th scope="col">H</th><th scope="col">G</th></tr>
  </thead>
  <tfoot>
    <tr><td>F</td><td>T</td></tr>
  </tfoot>
</table>
```

::::
