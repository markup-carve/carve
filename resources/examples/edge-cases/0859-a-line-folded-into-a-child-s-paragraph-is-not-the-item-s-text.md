---
page: edge-lists
---

## A line folded into a child's paragraph is not the item's text

An invalid opener that folds into a child item's or a quote's paragraph belongs to that paragraph. The item's own paragraph has not absorbed it, so a bare run at the item's column opens a div, and a column-0 line leaves the item (CARVE-P0-024, CARVE-P9-016).

::::: compare

```carve
- a
  - m
  :::e
  :::
l
```

```html
<ul>
  <li>a
    <ul>
      <li>m
:::e</li>
    </ul>
    <div>

    </div>
  </li>
</ul>
<p>l</p>
```

:::::

::::: compare

```carve
- a
  - m
   :::e
  :::
l
```

```html
<ul>
  <li>a
    <ul>
      <li>m
:::e</li>
    </ul>
    <div>

    </div>
  </li>
</ul>
<p>l</p>
```

:::::

::::: compare

```carve
- a
  > m
   :::e
  :::
 l
```

```html
<ul>
  <li>a
    <blockquote><p>m
:::e</p></blockquote>
    <div>

    </div>
  </li>
</ul>
<p>l</p>
```

:::::

::::: compare

```carve
- x
  - a
    > m
    ::::e
    :::
    :::
l
```

```html
<ul>
  <li>x
    <ul>
      <li>a
        <blockquote><p>m
::::e</p></blockquote>
        <div>

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>l</p>
```

:::::
