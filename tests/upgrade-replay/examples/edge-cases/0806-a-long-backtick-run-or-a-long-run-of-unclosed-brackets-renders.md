---
page: edge-inline
---

## A long backtick run or a long run of unclosed brackets renders

A code span pairs a backtick run with the next run of exactly its length, at any length (PART 3 `code_span`). An opening `[` with no `]` after it is literal text however many there are: unmatched brackets do not nest, so no nesting bound applies (PART 9 §25, carve#4134).

:::: compare

````````````carve
a `````````x````````` b
````````````

```html
<p>a <code>x</code> b</p>
```

::::

:::: compare

```carve
[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[x
```

```html
<p>[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[x</p>
```

::::
