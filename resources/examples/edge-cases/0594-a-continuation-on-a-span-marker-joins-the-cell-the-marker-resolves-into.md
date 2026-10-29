## A continuation on a span marker joins the cell the marker resolves into

A `+` fragment on a `^` or `<` column joins the cell the T5 walk resolves that
marker into, in row-major order (T6). On a `<` that is the cell it widens.

A BLOCKED marker is a cell of its own (T5). It renders no marker, and the
fragments on it are its content (markup-carve/carve#3151). A `<` in the first
column has no cell to widen:

::: compare

```carve
| a | b |
| < | c |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>x</td><td>c y</td></tr>
  </tbody>
</table>
```

:::


A `^` in the first row has no cell to extend:

::: compare

```carve
| ^ | b |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>x</td><td>b y</td></tr>
  </tbody>
</table>
```

:::


A `^` under a cell two columns wide would cover `b`:

::: compare

```carve
| a | < |
| ^ | b |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
    <tr><td>x</td><td>b y</td></tr>
  </tbody>
</table>
```

:::


A `<` beside a cell that started in an earlier row would cover `c`:

::: compare

```carve
| a | b |
| ^ | c |
| < | d |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td>b</td></tr>
    <tr><td>c</td></tr>
    <tr><td>x</td><td>d y</td></tr>
  </tbody>
</table>
```

:::


A blocked cell is widened like any other, and the `<` brings its fragment along:

::: compare

```carve
| ^ | < |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">x y</td></tr>
  </tbody>
</table>
```

:::
