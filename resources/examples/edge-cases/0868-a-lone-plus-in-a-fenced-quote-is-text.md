---
page: edge-containers
---

## A lone plus in a fenced quote is text

PART 2 and PART 9 §17 L5 (carve#4544). A `::: >` quote is the same block quote as the `>` spelling, but its body is a fenced container's, so a lone `+` in it is text and not a continuation marker.

:::::: compare

`````carve
::: >
+
# H
:::
`````

```html
<blockquote>
  <p>+</p>
  <h1 id="H">H</h1>
</blockquote>
```

::::::
