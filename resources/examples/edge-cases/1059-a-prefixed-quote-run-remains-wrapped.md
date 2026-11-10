---
page: edge-attributes
---

## A prefixed quote run remains wrapped

Both continuation lines carry the quote prefix and pass the brace column. The attributes apply to the heading (CARVE-P2-035, carve#5830).

::: compare

```carve
> {.x
>   .y}
> # H
```

```html
<blockquote>
  <h1 class="x y" id="H">H</h1>
</blockquote>
```

:::
