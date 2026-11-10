---
page: edge-attributes
---

## A quoted item's inner quoted run continues under the outer prefix

A run in a quote on a quoted item's marker line may continue under the outer quote prefix only; the line keeps its written source column. A valid run opens no paragraph, so the column-zero follower leaves every container, and a continuation at or left of the `{` refuses the run (CARVE-P2-035, carve#5835).

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
      <blockquote>

      </blockquote>
    </li>
  </ul>
</blockquote>
<p>plain</p>
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
