---
page: edge-lists
---

## A bullet line after a hostless caption line leaves later indented blocks out of the paragraph

PART 0 S3 and S4 (carve#4283). `^ p` with no host is paragraph text, the bullet line folds into it, and the indented quote marker opens a quote.

:::::: compare

`````carve
^ p
- x
  > q
`````

```html
<p>^ p
- x</p>
<blockquote><p>q</p></blockquote>
```

::::::
