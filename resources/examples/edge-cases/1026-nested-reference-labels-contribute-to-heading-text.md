---
page: edge-headings
---

## Nested reference labels contribute to heading text

PART 2 CARVE-P2-004 derives a heading id from the text that each inline carries, before reference resolution. A reference label can itself hold another reference label; every level contributes its text (carve#5664).

::: compare

```carve
# a [[x][]][]
```

```html
<section id="a-x">
  <h1>a [[x][]][]</h1>
</section>
```

:::

With no surrounding text, the generated id also resolves the outer collapsed reference through the heading index (PART 9R R1).

::: compare

```carve
# [[x][]][]
```

```html
<section id="x">
  <h1><a href="#x">x</a></h1>
</section>
```

:::
