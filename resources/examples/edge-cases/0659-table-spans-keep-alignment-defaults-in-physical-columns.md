## Table spans keep alignment defaults in physical columns

A lone `<` or `^` spans in every space-padding form. Alignment with `<`
requires content after its terminating space.

::: compare

```carve
|a| <|
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
  </tbody>
</table>
```

:::


The `=` kind marker makes a header cell, so a following literal `<` or `^`
is its content rather than a bare span marker.

::: compare

```carve
|a|= <|
|b|= ^|
```

```html
<table>
  <tbody>
    <tr><td>a</td><th scope="row">&lt;</th></tr>
    <tr><td>b</td><th scope="row">^</th></tr>
  </tbody>
</table>
```

:::

A merged header's marker sets a default only for its starting column. The
covered column remains independent in later rows.

::: compare

```carve
|=> Wide|<|=~ Last|
|a|b|c|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2" style="text-align: right;">Wide</th><th scope="col" style="text-align: center;">Last</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">a</td><td>b</td><td style="text-align: center;">c</td></tr>
  </tbody>
</table>
```

:::

A delimiter row can set the covered column independently. The right marker
on the merged head cell overrides the delimiter only in its starting column.

::: compare

```carve
|> Wide|<|~ Last|
|:--|:--|:--|
|a|b|c|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2" style="text-align: right;">Wide</th><th scope="col" style="text-align: center;">Last</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">a</td><td style="text-align: left;">b</td><td style="text-align: center;">c</td></tr>
  </tbody>
</table>
```

:::

Promoting a plain-pipe row with `header-rows` changes its HTML cell kind,
without promoting its per-cell alignment markers into column defaults.

::: compare

```carve
{header-rows=1}
|> Wide|<|~ Last|
|a|b|c|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2" style="text-align: right;">Wide</th><th scope="col" style="text-align: center;">Last</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

Two consecutive span markers extend the aligned origin across three columns.

::: compare

```carve
|< Wide|<|<|~ Last|
|a|b|c|d|
```

```html
<table>
  <tbody>
    <tr><td colspan="3" style="text-align: left;">Wide</td><td style="text-align: center;">Last</td></tr>
    <tr><td>a</td><td>b</td><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::

A vertical marker before `<` makes it literal cell content.

::: compare

```carve
|a|?^ <|
```

```html
<table>
  <tbody>
    <tr><td>a</td><td style="vertical-align: top;">&lt;</td></tr>
  </tbody>
</table>
```

:::

A covered column can keep a default through `aligns`.

::: compare

```carve
{aligns=,left,}
|= Wide|<|= Last|
|a|b|c|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2">Wide</th><th scope="col">Last</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td style="text-align: left;">b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

An explicit header row keeps column defaults in table attributes.

::: compare

```carve
{header-rows=1 aligns=right,left}
|> First|< Second|
|a|b|
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">First</th><th scope="col" style="text-align: left;">Second</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">a</td><td style="text-align: left;">b</td></tr>
  </tbody>
</table>
```

:::

A later row of header cells keeps its alignment local after body data.

::: compare

```carve
|=>^ A|<|=~ B|
|a|b|c|
|=<v D|<|= End|
|d|e|f|
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2" style="text-align: right; vertical-align: top;">A</th><th scope="col" style="text-align: center;">B</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right; vertical-align: top;">a</td><td>b</td><td style="text-align: center;">c</td></tr>
    <tr><th scope="row" colspan="2" style="text-align: left; vertical-align: bottom;">D</th><th scope="row" style="text-align: center;">End</th></tr>
    <tr><td style="text-align: right; vertical-align: top;">d</td><td>e</td><td style="text-align: center;">f</td></tr>
  </tbody>
</table>
```

:::

An all-header row after body data stays in `tbody` without a `thead`, and its alignments stay local.

::: compare

```carve
|a|b|
|=> X|=~ Y|
|c|d|
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><th scope="row" style="text-align: right;">X</th><th scope="row" style="text-align: center;">Y</th></tr>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|<|
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a| <|
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|< |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a| < |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|b|
|^|^|
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td rowspan="2">b</td></tr>
    <tr></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|b|
|^| ^|
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td rowspan="2">b</td></tr>
    <tr></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|b|
|^|^ |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td rowspan="2">b</td></tr>
    <tr></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|a|b|
|^| ^ |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td rowspan="2">b</td></tr>
    <tr></tr>
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

::: compare

```carve
|~ |
```

```html
<table>
  <tbody>
    <tr><td style="text-align: center;"></td></tr>
  </tbody>
</table>
```

:::

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

::: compare

```carve
|~{.x} |
```

```html
<table>
  <tbody>
    <tr><td class="x" style="text-align: center;"></td></tr>
  </tbody>
</table>
```

:::
