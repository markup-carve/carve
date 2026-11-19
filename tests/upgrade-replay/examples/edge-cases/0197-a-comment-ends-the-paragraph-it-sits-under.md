## A comment ends the paragraph it sits under

A comment at the item's content column closes its paragraph and retains nothing
(`CARVE-P0-024`, `CARVE-P0-005`). The following below-column line opens a
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
