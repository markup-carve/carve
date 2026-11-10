---
page: edge-attributes
---

## A quoted item's inner quoted run continues under the outer prefix

A run in a quote on a quoted item's marker line requires both quote prefixes on every continuation. A line with only the outer prefix refuses the run; later lines follow ordinary ownership (CARVE-P2-035, carve#5830, superseding carve#5835).

::: compare

```carve
> - > {.x
>      .y}
plain
```

```html
<blockquote>
  <ul>
    <li>
      <blockquote><p>{.x
.y}
plain</p></blockquote>
    </li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> - > {.x
>     .y}
plain
```

```html
<blockquote>
  <ul>
    <li>
      <blockquote><p>{.x
.y}
plain</p></blockquote>
    </li>
  </ul>
</blockquote>
```

:::
