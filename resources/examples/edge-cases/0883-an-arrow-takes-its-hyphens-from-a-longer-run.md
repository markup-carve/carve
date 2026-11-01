---
page: edge-inline
---

## An arrow takes its hyphens from a longer run

PART 3 CARVE-P3-022. An arrow consumes its own hyphens from the start of a longer run. The remainder reads on; since the single-hyphen arrows were removed (carve#4815), a leftover `->` is text.

::: compare

```carve
a<---b

<--->
```

```html
<p>a←-b</p>
<p>←-&gt;</p>
```

:::
