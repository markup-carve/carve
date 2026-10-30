---
page: edge-tables
---

## A quoted row attribute value may hold a pipe

`row_attributes` is a whole attribute block, so a `|` inside a quoted value belongs to the value and does not make the block a cell (carve#4323).

:::: compare

```carve
| a |{a="x|y"}
```

```html
<table>
  <tbody>
    <tr a="x|y"><td>a</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |{a='x|y|z' .c}
```

```html
<table>
  <tbody>
    <tr a="x|y|z" class="c"><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|= a |{a="|"}
```

```html
<table>
  <thead>
    <tr a="|"><th scope="col">a</th></tr>
  </thead>
</table>
```

::::
