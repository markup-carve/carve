---
page: edge-tables
---

## Native head rows with span placeholders

An orphan placeholder takes the head row's kind when the other cells it owns
are headers (CARVE-P9-006). Its `span` survives in the tree (CARVE-P12-048).

::: compare

```carve
| ^ |= Carve |= Djot |
| Row spans | yes | no |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col">Carve</th><th scope="col">Djot</th></tr>
  </thead>
  <tbody>
    <tr><td>Row spans</td><td>yes</td><td>no</td></tr>
  </tbody>
</table>
```

:::

A covered span placeholder carries its own physical column's default. The
origin's marker applies only to the origin column (CARVE-P9-004).

::: compare

```carve
|=> Price |<< |=~ Stock |
| 12.50 | EUR | 3 |
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2" style="text-align: right;">Price</th><th scope="col" style="text-align: center;">Stock</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">12.50</td><td style="text-align: left;">EUR</td><td style="text-align: center;">3</td></tr>
  </tbody>
</table>
```

:::

A space and further content keep `<x` as data. A kind marker keeps `<` as
header content. Neither is a span marker.

::: compare

```carve
| <x |
```

```html
<table>
  <tbody>
    <tr><td>&lt;x</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|= <|
```

```html
<table>
  <thead>
    <tr><th scope="col">&lt;</th></tr>
  </thead>
</table>
```

:::

A data payload shaped like a span alignment uses an escape (PART 11 §2).

::: compare

```carve
| \<< |
```

```html
<table>
  <tbody>
    <tr><td>&lt;&lt;</td></tr>
  </tbody>
</table>
```

:::

A `^` glued to a kind marker glued to the pipe is a header-kind span marker
(CARVE-P9-006). It is a header cell itself, so a head row of only orphan
placeholders still heads its table.

::: compare

```carve
|=^ |
| x |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th></tr>
  </thead>
  <tbody>
    <tr><td>x</td></tr>
  </tbody>
</table>
```

:::

An `=` after a space, or content after the `^`, leaves the cell as data.

::: compare

```carve
| =^ |
|=^x |
```

```html
<table>
  <tbody>
    <tr><td>=^</td></tr>
    <tr><td>=^x</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|\=^ |
```

```html
<table>
  <tbody>
    <tr><td>=^</td></tr>
  </tbody>
</table>
```

:::

A separator-promoted orphan `^` is a header cell in the tree, and the
canonical writer spells it header-kind (CARVE-P11-066).

::: compare

```carve
| ^ | a |
|---|---|
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col">a</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::
