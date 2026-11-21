---
page: edge-tables
---

## A continuation cell past the last column is a new cell

A `+` fragment with no cell above it appends one to the row above (PART 9 §5 T6).

::: compare

```carve
| a | b |
+ c | d | e |
```

```html
<table>
  <tbody>
    <tr><td>a c</td><td>b d</td><td>e</td></tr>
  </tbody>
</table>
```

:::

A skipped column gets an empty cell, and a later `+` line joins onto the new cell.

::: compare

```carve
| a |
+ b | | c |
+ d | | e |
```

```html
<table>
  <tbody>
    <tr><td>a b d</td><td></td><td>c e</td></tr>
  </tbody>
</table>
```

:::

An empty slot past the last cell appends nothing.

::: compare

```carve
| a |
+ b | |
```

```html
<table>
  <tbody>
    <tr><td>a b</td></tr>
  </tbody>
</table>
```

:::

The new cell's `^` is text, not a span marker.

::: compare

```carve
| a | x |
| b |
+ c | ^ |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>x</td></tr>
    <tr><td>b c</td><td>^</td></tr>
  </tbody>
</table>
```

:::

In a row of header cells the new cell is a header cell.

::: compare

```carve
|= a |
+ b | c |
| d | e |
```

```html
<table>
  <thead>
    <tr><th scope="col">a b</th><th scope="col">c</th></tr>
  </thead>
  <tbody>
    <tr><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

:::
