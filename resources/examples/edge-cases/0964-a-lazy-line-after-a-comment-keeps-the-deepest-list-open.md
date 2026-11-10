---
page: edge-lists
---

## A lazy line after a comment keeps the deepest list open

The lazy `{%` run's continuation misses the nested item's body column, so the run is refused (carve#5830 rule B) and its opener is literal. A later line does not change that (rule A). PART 0 S4 folds the run and the next plain line into the deepest open paragraph even when they miss that item's content column. The later blank separates the nested list's siblings under PART 9 §17 L1.

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
{% c
d %}
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
{% c
d %}
tail</p></li>
          <li><p>z</p></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::
