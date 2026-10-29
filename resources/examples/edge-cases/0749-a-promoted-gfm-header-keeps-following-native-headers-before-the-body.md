## A promoted GFM header keeps following native headers before the body

:::: compare

```carve
| a | b |
|---|---|
|= c |= d |
| e | f |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
    <tr><th scope="col">c</th><th scope="col">d</th></tr>
  </thead>
  <tbody>
    <tr><td>e</td><td>f</td></tr>
  </tbody>
</table>
```

::::
