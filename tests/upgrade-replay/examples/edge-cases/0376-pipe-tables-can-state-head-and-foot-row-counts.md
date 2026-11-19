## Pipe tables can state head and foot row counts

The explicit counts partition the rows. Rows in the explicit head are promoted
to column headers; a native `|=` cell in the body remains a row header.

::: compare

```carve
{header-rows=2 footer-rows=1}
| Region | Q1 |
| Detail | EUR |
|= North | 11 |
| All | 33 |
```

```html
<table>
  <thead>
    <tr><th scope="col">Region</th><th scope="col">Q1</th></tr>
    <tr><th scope="col">Detail</th><th scope="col">EUR</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">North</th><td>11</td></tr>
  </tbody>
  <tfoot>
    <tr><td>All</td><td>33</td></tr>
  </tfoot>
</table>
```

:::
