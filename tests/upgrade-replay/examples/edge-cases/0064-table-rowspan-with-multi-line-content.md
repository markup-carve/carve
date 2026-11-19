## Table rowspan with multi-line content

A `+` continuation before a `^` rowspan extends the spanned cell.

::: compare

```carve
|= Category       |= Item   |
| Fresh Fruits    | Apple   |
+ from local      |         |
+ farms           |         |
| ^               | Banana  |
```

```html
<table>
  <thead>
    <tr><th scope="col">Category</th><th scope="col">Item</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="2">Fresh Fruits from local farms</td><td>Apple</td></tr>
    <tr><td>Banana</td></tr>
  </tbody>
</table>
```

:::

A continuation row after the `^` row joins the row above it, and in a spanned
column the cell above is the spanning cell. So `more` joins `a`, while `d`
joins `c` in the column the span does not cover (§5 T6).

::: compare

```carve
| a | b |
| ^ | c |
+ more | d |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a more</td><td>b</td></tr>
    <tr><td>c d</td></tr>
  </tbody>
</table>
```

:::

A continuation row before the `^` row joins the origin row, which the `^` row
then extends. Its second cell joins `b`, not `c`.

::: compare

```carve
| a | b |
+ more | d |
| ^ | c |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a more</td><td>b d</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

:::
