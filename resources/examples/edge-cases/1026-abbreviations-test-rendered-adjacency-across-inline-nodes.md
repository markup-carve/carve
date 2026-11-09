---
page: edge-inline
---

## Abbreviations test rendered adjacency across inline nodes

PART 9R R3. A letter next to an abbreviation blocks expansion even when an
eligible inline node edge separates them.

::: compare

```carve
[w[HTML](u)]()

*[HTML]: t
```

```html
<p><a href="">wHTML</a></p>
```

:::

::: compare

```carve
w{*HTML*}

*[HTML]: t
```

```html
<p>w<strong>HTML</strong></p>
```

:::
