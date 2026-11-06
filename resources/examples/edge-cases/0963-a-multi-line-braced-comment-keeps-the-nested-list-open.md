---
page: edge-lists
---

## A multi-line braced comment keeps the nested list open

CARVE-P9-042 makes a comment-only paragraph invisible to list separation. The later marker reaches the deepest surviving container under CARVE-P0-024. CARVE-P2-035 still measures the continuation from the authored opening column.

::: compare

```carve
- a
  - b
{% c
  d %}
  - c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

A blank after the invisible comment loosens the nested list without closing it.

::: compare

```carve
- a
  - b
{% c
  d %}

  - c
```

```html
<ul>
  <li>a
    <ul>
      <li><p>b
</p></li>
      <li><p>c</p></li>
    </ul>
  </li>
</ul>
```

:::

A lazy line after the comment remains in the deepest item before the next marker.

::: compare

```carve
- a
  - b
{% c
  d %}
 x
  - c
```

```html
<ul>
  <li>a
    <ul>
      <li>b

x</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

A later marker can also open a deeper child under the surviving nested item.

::: compare

```carve
- a
  - b
{% c
  d %}
    - c
```

```html
<ul>
  <li>a
    <ul>
      <li>b

        <ul>
          <li>c</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::
