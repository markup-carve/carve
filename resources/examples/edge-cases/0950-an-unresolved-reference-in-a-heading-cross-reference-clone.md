---
page: edge-links
---

## An unresolved reference in a heading cross-reference clone

An unresolved reference renders its whole source literally (PART 9R R1). A cross-reference clones the heading text once (PART 9R R4), so it includes those literal bytes rather than a private reference frame (carve#5066).

::: compare

```carve
# [l][] t

</#l-t>
```

```html
<section id="l-t">
  <h1>[l][] t</h1>
  <p><a href="#l-t">[l][] t</a></p>
</section>
```

:::
