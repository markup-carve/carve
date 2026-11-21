---
page: edge-tables
---

## A deprecated cell alignment prefix reads as its braced run

The 0.1.13 cell prefixes `|=>`, `|<`, `|>^`, `|~~` and `|?v` stay readable
through 0.1.x and are removed in 0.2.0. Each gives the same tree and HTML as
the glued symbol run at the start of the cell's attribute block, which is the
only spelling the canonical writer emits (CARVE-P9-007). A legacy prefix
followed by an attribute block merges into one block, alignment first.

::: compare

```carve
|=> Price |= Item |= Size |= Mood |
| 12 |< pen |>^ big |~~ ok |
|?v 3 | ink |>{.num} 9 | fine |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">Price</th><th scope="col">Item</th><th scope="col">Size</th><th scope="col">Mood</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">12</td><td style="text-align: left;">pen</td><td style="text-align: right; vertical-align: top;">big</td><td style="text-align: center; vertical-align: middle;">ok</td></tr>
    <tr><td style="text-align: right; vertical-align: bottom;">3</td><td>ink</td><td class="num" style="text-align: right;">9</td><td>fine</td></tr>
  </tbody>
</table>
```

:::

The braced spelling of the same table:

::: compare

```carve
|={>} Price |= Item |= Size |= Mood |
| 12 |{<} pen |{>^} big |{~~} ok |
|{?v} 3 | ink |{> .num} 9 | fine |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">Price</th><th scope="col">Item</th><th scope="col">Size</th><th scope="col">Mood</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">12</td><td style="text-align: left;">pen</td><td style="text-align: right; vertical-align: top;">big</td><td style="text-align: center; vertical-align: middle;">ok</td></tr>
    <tr><td style="text-align: right; vertical-align: bottom;">3</td><td>ink</td><td class="num" style="text-align: right;">9</td><td>fine</td></tr>
  </tbody>
</table>
```

:::

`|=< |` keeps its 0.1.13 reading as an empty left-aligned header. A header-kind
colspan placeholder uses a space after `=`, like a body-row placeholder:
`|= < |`.

::: compare

```carve
|= Name |= < |= Qty |
| pen |< | 3 |
```

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2">Name</th><th scope="col">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td colspan="2">pen</td><td>3</td></tr>
  </tbody>
</table>
```

:::
