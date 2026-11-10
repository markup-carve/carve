---
page: edge-lists
---

## A multi-line braced comment keeps the nested list open

The comment run's continuation misses the nested item's body column, so the run takes no lazy line and is refused (carve#5830 rule B). Its opener is literal paragraph text in the nested item, and the later marker reaches the deepest surviving container under CARVE-P0-024.

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
{% c
d %}</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

A blank after the refused run loosens the nested list without closing it.

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
{% c
d %}</p></li>
      <li><p>c</p></li>
    </ul>
  </li>
</ul>
```

:::

A lazy line after the refused run remains in the deepest item before the next marker.

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
{% c
d %}
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
{% c
d %}
        <ul>
          <li>c</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::
