---
page: edge-tables
---

## An escaped row closer stays in an open code span

CARVE-P2-019 rule 3 keeps the final `\|` verbatim in an open code span while its pipe closes the row (markup-carve/carve#5667).

::: compare

```carve
|`\|
```

```html
<table>
  <tbody>
    <tr><td><code>\|</code></td></tr>
  </tbody>
</table>
```

:::

The same closer stays in the last cell of a wider row.

::: compare

```carve
| a | ``b\|
```

```html
<table>
  <tbody>
    <tr><td>a</td><td><code>b\|</code></td></tr>
  </tbody>
</table>
```

:::

A continuation can carry the escaped closer into an existing open run.

::: compare

```carve
| a `b |
+ c\|
```

```html
<table>
  <tbody>
    <tr><td>a <code>b c\|</code></td></tr>
  </tbody>
</table>
```

:::
