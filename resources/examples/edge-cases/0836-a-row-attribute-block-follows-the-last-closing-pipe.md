---
page: edge-tables
---

## A row attribute block follows the last closing pipe

A cell may start with `{` directly after a pipe. It is not the row's attribute block when the payload it would open is not valid attribute syntax, and the valid block after the closing pipe still belongs to the row (carve#4322).

:::: compare

```carve
| a |{~|{.c}
```

```html
<table>
  <tbody>
    <tr class="c"><td>a</td><td>{~</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|{=|{#r}
```

```html
<table>
  <tbody>
    <tr id="r"><td>{=</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a |{bad!!}
```

```html
<p>| a |{bad!!}</p>
```

::::
