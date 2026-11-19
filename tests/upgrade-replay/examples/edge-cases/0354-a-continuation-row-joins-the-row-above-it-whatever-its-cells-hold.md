## A continuation row joins the row above it, whatever its cells hold

What a `+` row joins is the row above it in the SOURCE, and the only line that
declines is a delimiter row, which T7 consumes. A HEADER row is a row, so a
continuation joins it - onto a native `|=` cell as readily as onto a data cell
(markup-carve/carve#1354).

::: compare

```carve
|= a |= b |
+ cont |
```

```html
<table>
  <thead>
    <tr><th scope="col">a cont</th><th scope="col">b</th></tr>
  </thead>
</table>
```

:::

An all-header row that is not the table's first is joinable for the same
reason:

::: compare

```carve
| a |
|= b |
+ c |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
    <tr><th scope="row">b c</th></tr>
  </tbody>
</table>
```

:::

THE DELIMITER ROW IS WHAT DECLINES, and it declines under a NATIVE header row
too - which is what tells the two readings apart, since header-ness is present
here and the answer is still prose. *A continuation row needs a body row* above
pins the GFM spelling of the same decline:

::: compare

```carve
|= a |
| - |
+ cont |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th></tr>
  </thead>
</table>
<p>+ cont |</p>
```

:::

AN ALL-EMPTY CONTINUATION ROW IS ONE TOO. T2's minimum-cell guard is the
STANDARD row's - it decides what OPENS a table - and a continuation row opens
nothing and produces no `<tr>`, so a row whose every cell is empty appends
nothing, which is what T6 already provides for:

::: compare

```carve
| a |
+ |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

The two-column twin is the control that shows the guard was answering one
clause twice by column count: it was absorbed all along, because only the
one-column shape reaches a one-cell test.

::: compare

```carve
| a | b |
+ | |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

And the empty row declines under a delimiter row exactly as a filled one does,
so the two halves of this rule compose rather than override:

::: compare

```carve
| a | b |
| - | - |
+ |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
</table>
<p>+ |</p>
```

:::
