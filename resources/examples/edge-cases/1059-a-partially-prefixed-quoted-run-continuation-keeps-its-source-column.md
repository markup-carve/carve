---
page: edge-attributes
---

## A partially prefixed quoted run continuation keeps its source column

A multi-line run requires every quote prefix on every continuation. The partially prefixed lines below refuse their runs regardless of source column; later lines follow ordinary paragraph ownership (CARVE-P2-035, carve#5830, superseding the earlier reading of carve#5822 and carve#5827).

::: compare

```carve
> > {.x
>    .y}
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
> >  {.x
>     .y}
```

```html
<blockquote>
  <blockquote><p>{.x
.y}</p></blockquote>
</blockquote>
```

:::

::: compare

```carve
- > {.x
  >  .y}
plain
```

```html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>plain</p>
```

:::
