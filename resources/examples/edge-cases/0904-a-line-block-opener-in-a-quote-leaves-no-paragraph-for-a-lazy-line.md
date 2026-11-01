---
page: edge-lists
---

## A line-block opener in a quote leaves no paragraph for a lazy line

CARVE-P9-083 and PART 0 S4 (carve#4740). An empty line block holds no stanza, so a line after the quote is the item's paragraph and a later lazy line continues it.

::: compare

```carve
- > ::: |
  a
b
```

```html
<ul>
  <li>
    <blockquote>
      <div class="line-block">

      </div>
    </blockquote>
    a
b
  </li>
</ul>
```

:::

::: compare

```carve
> - > ::: |
>   a
b
```

```html
<blockquote>
  <ul>
    <li>
      <blockquote>
        <div class="line-block">

        </div>
      </blockquote>
      a
b
    </li>
  </ul>
</blockquote>
```

:::
