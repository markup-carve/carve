---
page: edge-blocks
---

## A refused plus after a block a quote's plus attached folds into the open paragraph

PART 9 §17 L3 (carve#3421, carve#4209). A `+` with no following block is read as a letter at its column, so it folds into the open item paragraph and the quote stays open.

:::::: compare

`````carve
>
+
. e
+
`````

```html
<blockquote>
  <ol>
    <li>e
+</li>
  </ol>
</blockquote>
```

::::::
