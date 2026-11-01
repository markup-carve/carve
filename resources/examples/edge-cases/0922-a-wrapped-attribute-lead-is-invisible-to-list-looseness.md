---
page: edge-lists
---

## A wrapped attribute lead is invisible to list looseness

PART 9 §17 L1a and L1b (CARVE-P9-029, CARVE-P9-030; carve#4758). An attribute block that wraps across physical lines is one invisible lead. A blank after it separates no visible item content, just as after a one-line attribute block.

:::::: compare

`````carve
- {x
  y}

  b
- a
`````

```html
<ul>
  <li><p x="" y="">b</p></li>
  <li>a</li>
</ul>
```

::::::

The same rule applies to an ordered list with a wider content column.

:::::: compare

`````carve
1. {x
   y}

   b
2. a
`````

```html
<ol>
  <li><p x="" y="">b</p></li>
  <li>a</li>
</ol>
```

::::::
