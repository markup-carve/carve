---
page: edge-attributes
---

## A partially prefixed quoted run continuation keeps its source column

A continuation under fewer quote prefixes than its opener is read past the prefixes it has and keeps its written source column. A valid run opens no paragraph, so the column-zero follower leaves every quote (CARVE-P2-035, carve#5822, carve#5827).

::: compare

```carve
> > {.x
>    .y}
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
> >  {.x
>     .y}
```

```html
<blockquote>
  <blockquote>

  </blockquote>
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
