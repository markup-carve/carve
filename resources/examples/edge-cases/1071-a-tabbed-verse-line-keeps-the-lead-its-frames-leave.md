---
page: edge-lists
---

## A tabbed verse line keeps the lead its frames leave

Each container strips its own columns from a verse line, and the rest of the line walks from that container's content column (carve#5755). Under an opener at the item's content column, two spaces and a tab therefore keep four lead columns, as the per-frame space spelling does (PART 9 §23, §24 C5, carve#5881).

::: compare

```carve
- a
  ::: |
  	x
  :::
```

```html
<ul>
  <li>a
    <div class="line-block">
      <p>&nbsp;&nbsp;&nbsp;&nbsp;x</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  ::: |
      x
  :::
```

```html
<ul>
  <li>a
    <div class="line-block">
      <p>&nbsp;&nbsp;&nbsp;&nbsp;x</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
:: t
: d
  ::: |
  	x
  :::
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <div class="line-block">
      <p>&nbsp;&nbsp;&nbsp;&nbsp;x</p>
    </div>
  </dd>
</dl>
```

:::

::: compare

```carve
> - a
>   ::: |
>   	x
>   :::
```

```html
<blockquote>
  <ul>
    <li>a
      <div class="line-block">
        <p>&nbsp;&nbsp;&nbsp;&nbsp;x</p>
      </div>
    </li>
  </ul>
</blockquote>
```

:::
