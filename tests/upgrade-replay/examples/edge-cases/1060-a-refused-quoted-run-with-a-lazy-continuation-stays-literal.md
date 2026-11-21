---
page: edge-attributes
---

## A refused quoted run with a lazy continuation stays literal

A multi-line run takes no lazy continuation. Its refused opener is literal text, and the `#a` after that opener follows ordinary inline parsing (CARVE-P2-035, carve#5830, superseding carve#5829).

::: compare

```carve
- > {#a
   .y}
```

```html
<ul>
  <li>
    <blockquote><p>{<span class="tag"><strong>#a</strong></span>
.y}</p></blockquote>
  </li>
</ul>
```

:::

::: compare

```carve
> - {#a
   .y}
```

```html
<blockquote>
  <ul>
    <li>{<span class="tag"><strong>#a</strong></span>
.y}</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> {#a
 .y}
```

```html
<blockquote><p>{<span class="tag"><strong>#a</strong></span>
.y}</p></blockquote>
```

:::
