---
page: edge-headings
---

## A heading id reverses every double arrow

A heading id reverses smart typography to its ASCII source before slugging (CARVE-P2-004, carve#4293). `⇐` reverses to `<==` and `⇔` to `<=>`, like `⇒` to `==>`, so the arrow collapses into the separator and no glyph reaches the id.

::: compare

```carve
# a <== b
```

```html
<section id="a-b">
  <h1>a ⇐ b</h1>
</section>
```

:::

::: compare

```carve
# a <=> b
```

```html
<section id="a-b">
  <h1>a ⇔ b</h1>
</section>
```

:::

::: compare

```carve
# x <==b and y<=>z
```

```html
<section id="x-b-and-y-z">
  <h1>x ⇐b and y⇔z</h1>
</section>
```

:::
