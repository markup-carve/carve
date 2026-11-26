---
page: edge-lists
---

## A leading content tab sets the item's content column where the content starts

CARVE-P2-010 (carve#4610). A tab after the marker's separator is content and does not move the content column, which stays at 2. After the blank, `f` at column 2 reaches it and continues the item. The section title names the reading carve#4610 replaced and stays as the corpus name.

:::::: compare

`````carve
- 	e

  f
`````

```html
<ul>
  <li><p>	e</p>
    <p>f</p>
  </li>
</ul>
```

::::::
