---
page: edge-containers
---

## A quote-attached colon keeps a later plus

An unclosed colon body attached by a marker-line `+` keeps a later `+` at the quote's marker column as paragraph text (PART 0 P1 and P8, PART 9 §17 L5, carve#5658 ruling A).

:::::: compare

`````carve
> +
::: note
x
+
zq
`````

```html
<blockquote>
  <aside class="admonition note" aria-label="Note">
    <p>x
+
zq</p>
  </aside>
</blockquote>
```

::::::
