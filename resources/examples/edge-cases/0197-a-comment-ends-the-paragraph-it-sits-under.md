## A comment ends the paragraph it sits under

A comment at the item's content column closes its paragraph and retains nothing
(`CARVE-P0-009` X1, `CARVE-P9-053`). The following below-column line opens a
document paragraph, and the next list starts after it.

::: compare

```carve
- a
  %% x
 b

- c
```

```html
<ul>
  <li><p>a
b</p></li>
  <li><p>c</p></li>
</ul>
```

:::
