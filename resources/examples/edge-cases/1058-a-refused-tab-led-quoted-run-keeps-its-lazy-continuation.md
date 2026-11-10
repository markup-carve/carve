---
page: edge-attributes
---

## A refused tab-led quoted run keeps its lazy continuation

A tab before a quoted run's `{` widens to its source tab stop. An unprefixed continuation at or left of that column refuses the run, and the refused text keeps its lazy line in the quote's paragraph at every quote depth. A continuation past it continues the run, even when the `{` is indented inside a nested quote (CARVE-P2-035, carve#5828).

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
  <blockquote><p class="x y">z</p></blockquote>
</blockquote>
```

:::
