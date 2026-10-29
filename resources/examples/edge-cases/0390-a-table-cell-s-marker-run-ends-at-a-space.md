## A table cell's marker run ends at a space

A cell's marker run is the kind marker `=`, the alignment run and the attribute
block, in T10's order, and PART 9 §5 T11 gives it the terminator it never had: a
run must be followed by one space. Without that space there is no run, and every
character of it is content. The alignment run already worked this way; the kind
marker and the attribute block did not, so a cell whose content began with `=`
lost it to a marker nobody wrote.

::: compare

```carve
|=hot= is the reading |
```

```html
<table>
  <tbody>
    <tr><td><mark>hot</mark> is the reading</td></tr>
  </tbody>
</table>
```

:::

The header cell is the padded spelling, and it is what a canonical writer
already emits (PART 11 §6e), so a formatted document needs no migration:

::: compare

```carve
|= Item |= Qty |
| Pen | 9 |
```

```html
<table>
  <thead>
    <tr><th scope="col">Item</th><th scope="col">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td>Pen</td><td>9</td></tr>
  </tbody>
</table>
```

:::

An attribute block is part of the run and takes the same space. Glued to the
content it is not a block at all, which is why the braces reach the output:

::: compare

```carve
|{.total} 99 |
|{.total}99 |
```

```html
<table>
  <tbody>
    <tr><td class="total">99</td></tr>
    <tr><td>{.total}99</td></tr>
  </tbody>
</table>
```

:::

THE CLOSING PIPE IS NOT A TERMINATOR, so an empty marked cell takes its space
too. A cell with NO run is the one shape this clause leaves alone: `|a|` still
means what it meant, because there is no marker for the space to end.

::: compare

```carve
|= |a|
|=|a|
```

```html
<table>
  <tbody>
    <tr><th scope="row"></th><td>a</td></tr>
    <tr><td>=</td><td>a</td></tr>
  </tbody>
</table>
```

:::

An escape reaches the reading a space cannot spell, unchanged by this clause:

::: compare

```carve
|\= a |
```

```html
<table>
  <tbody>
    <tr><td>= a</td></tr>
  </tbody>
</table>
```

:::
