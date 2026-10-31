---
page: edge-lists
---

## A fence on a note line in an item holds no paragraph

A note whose first line opens a code fence holds a code block, so a column-0 line after it has no paragraph to fold into and leaves the item (CARVE-P0-010, CARVE-P0-013).

::: compare

````carve
- a
  [^f]: ```
c
````

````html
<ul>
  <li>a</li>
</ul>
<p>c</p>
````

:::

::: compare

```carve
- a
  [^f]: ~~~
c
```

```html
<ul>
  <li>a</li>
</ul>
<p>c</p>
```

:::
