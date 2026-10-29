## Cell attributes bind after the kind and alignment markers

A cell's `{…}` attribute block attaches AFTER the kind marker `=` and after the
alignment marker, in every cell. The block is glued to the marker run where the
cell has one and to the opening `|` where it has none; a space in front of it
still keeps it literal. This is what makes an attributed HEADER cell
expressible: with the block bound ahead of the `=`, the only available shape is
`|{#x}=R|`, which reads as a data cell whose content starts with `=`.

::: compare

```carve
|={.total} Total |= 99 |
| a | b |
```

```html
<table>
  <thead>
    <tr><th scope="col" class="total">Total</th><th scope="col">99</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

Both markers may precede the block. The kind marker comes first, then the
alignment marker, then the attributes; a native alignment marker on a header
cell still sets the whole column's alignment.

::: compare

```carve
|=~{#score} Score |
| 9 |
```

```html
<table>
  <thead>
    <tr><th scope="col" id="score" style="text-align: center;">Score</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: center;">9</td></tr>
  </tbody>
</table>
```

:::

On a data cell the alignment marker likewise comes first, and the computed
alignment composes with the authored block rather than replacing it.

::: compare

```carve
|= Item |= Cost |
| Pen |>{.num} 9 |
```

```html
<table>
  <thead>
    <tr><th scope="col">Item</th><th scope="col">Cost</th></tr>
  </thead>
  <tbody>
    <tr><td>Pen</td><td class="num" style="text-align: right;">9</td></tr>
  </tbody>
</table>
```

:::

The other order is no longer a marker position. A `<` written AFTER the
attribute block is ordinary content, so the cell carries the attributes and is
not aligned. This is the released spelling that changes meaning, and it
reinterprets rather than erroring. The block is followed by the space that ends
the marker run (T11); without it the braces would be content too.

::: compare

```carve
|{#x} < content |
```

```html
<table>
  <tbody>
    <tr><td id="x">&lt; content</td></tr>
  </tbody>
</table>
```

:::

The shape that used to be the only candidate for an attributed header cell is
still a data cell, which is the ambiguity the rule removes: the `=` is content
because the block ahead of it already committed the cell.

::: compare

```carve
|{#x} =R |
```

```html
<table>
  <tbody>
    <tr><td id="x">=R</td></tr>
  </tbody>
</table>
```

:::

Row attributes do not move. They stay glued to the row's closing `|`, and they
compose with cell attributes written in the new position.

::: compare

```carve
|=<{.h} Name |=>{.c} Score |{.head}
| Ann |>{.num} 9 |{.win}
```

```html
<table>
  <thead>
    <tr class="head"><th scope="col" class="h" style="text-align: left;">Name</th><th scope="col" class="c" style="text-align: right;">Score</th></tr>
  </thead>
  <tbody>
    <tr class="win"><td style="text-align: left;">Ann</td><td class="num" style="text-align: right;">9</td></tr>
  </tbody>
</table>
```

:::
