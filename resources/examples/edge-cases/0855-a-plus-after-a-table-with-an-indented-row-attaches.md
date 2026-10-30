---
page: edge-lists
---

## A plus after a table with an indented row attaches

A table's rows stay its rows at any indent, so the attached block ends where they do and the next `+` reaches the item (CARVE-P9-067).

::: compare

```carve
- a
+
|x|
 |y|
+
H
```

```html
<ul>
  <li>a
    <table>
      <tbody>
        <tr><td>x</td></tr>
        <tr><td>y</td></tr>
      </tbody>
    </table>
    H
  </li>
</ul>
```

:::
