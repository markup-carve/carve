---
page: edge-tables
---

## A cell's escaped pipe reaches a link destination

In a table cell `\|` is the escape for a pipe, and a link or image destination receives the unescaped `|`, so a pipe in a URL can be spelled (markup-carve/carve#4549).

::: compare

```carve
| [x](/a\|b) |
```

```html
<table>
  <tbody>
    <tr><td><a href="/a|b">x</a></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| ![i](/a\|b) |
```

```html
<table>
  <tbody>
    <tr><td><img src="/a|b" alt="i"></td></tr>
  </tbody>
</table>
```

:::

A code span is verbatim and keeps the backslash.

::: compare

```carve
| `a\|b` and [x](/a\|b) |
```

```html
<table>
  <tbody>
    <tr><td><code>a\|b</code> and <a href="/a|b">x</a></td></tr>
  </tbody>
</table>
```

:::

Outside a table `\|` is no destination escape, and the backslash stays.

::: compare

```carve
[x](/a\|b)
```

```html
<p><a href="/a\|b">x</a></p>
```

:::
