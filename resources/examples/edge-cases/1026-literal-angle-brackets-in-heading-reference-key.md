---
page: edge-inline
---

## Literal angle brackets in heading reference key

A collapsed reference uses the heading's rendered plain text as its lookup key. Literal angle brackets remain text after the inline pass (PART 9R R1; carve#5665).

:::: compare

```carve
# [<>][]
```

```html
<section id="s">
  <h1><a href="#s">&lt;&gt;</a></h1>
</section>
```

::::
