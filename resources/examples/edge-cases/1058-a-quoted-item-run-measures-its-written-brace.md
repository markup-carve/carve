---
page: edge-attributes
---

## A quoted item run measures its written brace

On a quoted item's marker line, an unprefixed continuation is compared with the `{` where it is written, past marker-glued attributes, quote levels and the item's own indentation. A valid run opens no paragraph, so the column-zero follower leaves the quote (CARVE-P2-035, carve#5619, carve#5826).

::: compare

```carve
> -{.a} {.x
         .y}
plain
```

```html
<blockquote>
  <ul>
    <li class="a"></li>
  </ul>
</blockquote>
<p>plain</p>
```

:::

::: compare

```carve
> > - {.x
       .y}
plain
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
  </blockquote>
</blockquote>
<p>plain</p>
```

:::

::: compare

```carve
>  - {.x
     .y}
plain
```

```html
<blockquote>
  <ul>
    <li>{.x
.y}
plain</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> > - {.x
> >    .y}
plain
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
  </blockquote>
</blockquote>
<p>plain</p>
```

:::
