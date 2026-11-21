---
page: edge-footnotes
---

## A fence a note's marker-line item opens ends at a column-zero line

PART 0 S1 and CARVE-P0-024 (carve#4327). A line at column 0 misses the note, so it ends the note's item and its open fence.

:::::: compare

`````carve
[^n]: - ``` js
tail
`````

```html
<p>tail</p>
```

::::::
