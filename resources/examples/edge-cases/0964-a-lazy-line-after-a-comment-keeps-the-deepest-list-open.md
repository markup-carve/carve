---
page: edge-lists
---

## A lazy line after a comment keeps the deepest list open

CARVE-P9-013 makes the braced-comment-only run invisible to list ownership. PART 0 S4 folds the next plain line into the deepest open paragraph even when it misses that item's content column. The later blank separates the nested list's siblings under PART 9 §17 L1. CARVE-P2-035 measures the comment continuation in authored columns.

::: compare

```carve
- a
  - b
{% c
 d %}
 tail

  - z
```

```html
<ul>
  <li>a
    <ul>
      <li><p>b

tail</p></li>
      <li><p>z</p></li>
    </ul>
  </li>
</ul>
```

:::

A line at the ancestor's content column still continues the innermost paragraph when that paragraph is open.

::: compare

```carve
- a
  - mid
    - b
 {% c
   d %}
  tail

    - z
```

```html
<ul>
  <li>a
    <ul>
      <li>mid
        <ul>
          <li><p>b

tail</p></li>
          <li><p>z</p></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::
