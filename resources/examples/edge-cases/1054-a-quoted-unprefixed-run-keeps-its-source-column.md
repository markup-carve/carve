---
page: edge-attributes
---

## A quoted unprefixed run keeps its source column

The unprefixed continuation cannot complete a quoted run. The opener is literal text, and later lines follow ordinary quote laziness (CARVE-P2-035, carve#5830).

::: compare

```carve
> > {.x
     .y}
plain
```

```html
<blockquote>
  <blockquote><p>{.x
.y}
plain</p></blockquote>
</blockquote>
```

:::

::: compare

```carve
> 	{.x
     .y}
plain
```

```html
<blockquote><p>{.x
.y}
plain</p></blockquote>
```

:::
