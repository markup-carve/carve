## Table span marker in first column

A span marker (`^` rowspan / `<` colspan) must be the whole cell. In the first
column a `<` (or in the first row a `^`) has nothing to merge into, so it
renders as an empty cell rather than being dropped.

::: compare

```carve
| < | b |
|---|---|
| c | d |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::
