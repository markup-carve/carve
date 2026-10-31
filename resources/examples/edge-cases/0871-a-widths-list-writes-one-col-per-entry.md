---
page: edge-tables
---

## A widths list writes one col per entry

`widths` emits a `colgroup` with one `col` per entry, not one per column. A list shorter than the row leaves the tail unset and writes no `col` for it (CARVE-P12-039, markup-carve/carve#4587).

::: compare

```carve
{widths=25,50}
| a | b | c |
```

```html
<table>
  <colgroup>
    <col style="width: 25%;">
    <col style="width: 50%;">
  </colgroup>
  <tbody>
    <tr><td>a</td><td>b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

An empty entry is still an entry, so it writes a bare `col`.

::: compare

```carve
{widths=,50}
| a | b | c |
```

```html
<table>
  <colgroup>
    <col>
    <col style="width: 50%;">
  </colgroup>
  <tbody>
    <tr><td>a</td><td>b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

A width above 100 is invalid and leaves its column unset. With no valid width left, there is no `colgroup`.

::: compare

```carve
{widths=101}
| a |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
{widths=50,101}
| a | b |
```

```html
<table>
  <colgroup>
    <col style="width: 50%;">
    <col>
  </colgroup>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::
