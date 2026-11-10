---
page: edge-attributes
---

## A quoted unprefixed run keeps its source column

A continuation without quote prefixes uses its written source column at every quote depth. A valid run opens no paragraph, so the column-zero follower leaves the quote (CARVE-P2-035, carve#5619, carve#5796).

::: compare

```carve
> > {.x
     .y}
plain
```

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<p>plain</p>
```

:::

::: compare

```carve
> 	{.x
     .y}
plain
```

```html
<blockquote>

</blockquote>
<p>plain</p>
```

:::
