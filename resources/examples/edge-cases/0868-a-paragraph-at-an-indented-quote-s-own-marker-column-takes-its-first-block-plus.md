---
page: edge-blocks
---

## A paragraph at an indented quote's own marker column takes its first-block plus

CARVE-P9-067, PART 9 §17 L4 (carve#4384). A block quote accepts a non-list block at its own marker column, so a paragraph there is the quote's one block.

:::::: compare

`````carve
 > +
 x
`````

```html
<blockquote><p>x</p></blockquote>
```

::::::
