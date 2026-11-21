---
page: edge-headings
---

## A cloned heading drops its ids

A cross-reference's link text clones the heading's inline nodes, and the clone drops every id, so no id appears twice in the document (markup-carve/carve#4554).

::: compare

```carve
# *A*{#z}

</#A>
```

```html
<section id="A">
  <h1><strong id="z">A</strong></h1>
  <p><a href="#A"><strong>A</strong></a></p>
</section>
```

:::

Ids drop at every depth, and every other attribute stays on its own element.

::: compare

```carve
# *[b]{#y abbr="T"}*{#z}

</#b>
```

```html
<section id="b">
  <h1><strong id="z"><abbr title="T" id="y">b</abbr></strong></h1>
  <p><a href="#b"><strong><abbr title="T">b</abbr></strong></a></p>
</section>
```

:::
