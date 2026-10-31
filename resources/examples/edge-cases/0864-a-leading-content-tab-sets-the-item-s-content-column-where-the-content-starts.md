---
page: edge-lists
---

## A leading content tab sets the item's content column where the content starts

CARVE-P2-010 (carve#4103). A tab after the marker puts the content, and so the content column, at the next tab stop. After the blank, `f` at column 2 is short of that column and leaves the list.

:::::: compare

`````carve
- 	e

  f
`````

```html
<ul>
  <li>e</li>
</ul>
<p>f</p>
```

::::::
