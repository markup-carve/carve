---
page: edge-attributes
---

## A refused tab-led quoted run keeps its lazy continuation

A tab before a quoted run's `{` widens to its source tab stop. Every multiline continuation must carry the quote prefixes; a missing prefix refuses the run at any column. The refused opener is literal, and later lines follow ordinary quote ownership. A fully prefixed continuation is compared with the written brace column (CARVE-P2-035, carve#5830, superseding the unprefixed case of carve#5828).

::: compare

```carve
>   	{.x
        .y}
```

```html
<blockquote><p>{.x
.y}</p></blockquote>
```

:::

::: compare

```carve
> > 	{.x
>      .y}
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
> >  {.x
>      .y}
> > z
```

```html
<blockquote>
  <blockquote><p>{.x
.y}
z</p></blockquote>
</blockquote>
```

:::
