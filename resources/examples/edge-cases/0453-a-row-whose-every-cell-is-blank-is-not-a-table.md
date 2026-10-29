## A row whose every cell is blank is not a table

This section's name records the ruling of markup-carve/carve#1950, which
markup-carve/carve#2879 replaced; the corpus numbering is append-only, so it
keeps its name. An explicitly delimited row is a table row whatever its cells
hold (PART 9 §5 T2), so the three rows that ruling turned into paragraphs are
tables again. The section "An explicitly delimited row of blank cells is a
table" carries the full rule.

Two empty data cells:

::: compare

```carve
|||
```

```html
<table>
  <tbody>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

Padding spaces are not content, so this is the same two-cell row:

::: compare

```carve
| | |
```

```html
<table>
  <tbody>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

An empty header cell is a header-only table, the same way `| |` is a one-cell
data table:

::: compare

```carve
|= |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th></tr>
  </thead>
</table>
```

:::

The controls are unchanged. A row with content:

::: compare

```carve
|a|b|
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

One filled cell beside an empty one:

::: compare

```carve
| a | |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td></td></tr>
  </tbody>
</table>
```

:::

An empty cell carrying an attribute block:

::: compare

```carve
|{.x} |
```

```html
<table>
  <tbody>
    <tr><td class="x"></td></tr>
  </tbody>
</table>
```

:::

An empty cell carrying an alignment run:

::: compare

```carve
|> |
```

```html
<table>
  <tbody>
    <tr><td style="text-align: right;"></td></tr>
  </tbody>
</table>
```

:::
