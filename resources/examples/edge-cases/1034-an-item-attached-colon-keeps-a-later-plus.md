---
page: edge-lists
---

## An item-attached colon keeps a later plus

An unclosed colon body attached by a marker-line `+` keeps a later `+` at the item's marker column as paragraph text (PART 0 P1 and P8, PART 9 §17 L5, carve#5658 ruling A).

:::::: compare

`````carve
- +
::: note
x
+
zq
`````

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>x
+
zq</p>
    </aside>
  </li>
</ul>
```

::::::
