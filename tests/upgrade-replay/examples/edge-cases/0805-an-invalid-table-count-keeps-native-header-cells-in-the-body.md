## An invalid table count keeps native header cells in the body

An invalid or overlapping `header-rows` or `footer-rows` count synthesizes no partition, so the rows render in one body group (CARVE-P12-034, carve#4137). A native `|=` cell outside an explicit head stays a header cell with row scope; the invalid count does not bring back the implicit head a first `|=` row gets without it.

:::: compare

```carve
{header-rows=7}
|= a |
| b |
```

```html
<table>
  <tbody>
    <tr><th scope="row">a</th></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
{header-rows=x}
|= a |= b |
| c | d |
```

```html
<table>
  <tbody>
    <tr><th scope="row">a</th><th scope="row">b</th></tr>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
{header-rows=1 footer-rows=2}
|= a |
| b |
```

```html
<table>
  <tbody>
    <tr><th scope="row">a</th></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

::::
