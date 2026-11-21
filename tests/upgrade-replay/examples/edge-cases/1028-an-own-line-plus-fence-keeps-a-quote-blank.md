---
page: edge-containers
---

## An own line plus fence keeps a quote blank

A quote's own-line `+` fence keeps the blank and later prefixed payload, as every host does (PART 0 S1, carve#5560 and carve#5635).

:::::: compare

`````carve
> p
+
```
a

> zq
`````

```html
<blockquote>
  <p>p</p>
  <pre><code>a

zq
</code></pre>
</blockquote>
```

::::::
