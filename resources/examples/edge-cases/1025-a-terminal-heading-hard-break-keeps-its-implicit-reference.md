---
page: edge-headings
---

## A terminal heading hard break keeps its implicit reference

PART 2 CARVE-P2-004 and PART 9R R1 key a heading's implicit reference by its
rendered plain text. A hard break at the end writes `<br>` and a serialization
newline in HTML, but contributes no text to that key (carve#5659).

::: compare

```carve
# [g][]\
```

```html
<section id="g">
  <h1><a href="#g">g</a><br>
</h1>
</section>
```

:::

The same key is available to a reference after the heading.

::: compare

```carve
# g\

[g][]
```

```html
<section id="g">
  <h1>g<br>
</h1>
  <p><a href="#g">g</a></p>
</section>
```

:::
