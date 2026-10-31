---
page: edge-links
---

## An undefined label and a cloned heading title

A full reference whose label has no definition stays literal text. It does not fall back to the heading index, even when its text names a heading (PART 9R, CARVE-P9R-001).

::: compare

```carve
# Intro

[Intro][nothing]
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>[Intro][nothing]</p>
</section>
```

:::

Display text derived from a heading clones the heading's inline nodes, so its markup survives (CARVE-P9R-006).

::: compare

```carve
# *H*

[see </#H>](/u)
```

```html
<section id="H">
  <h1><strong>H</strong></h1>
  <p><a href="/u">see <strong>H</strong></a></p>
</section>
```

:::
