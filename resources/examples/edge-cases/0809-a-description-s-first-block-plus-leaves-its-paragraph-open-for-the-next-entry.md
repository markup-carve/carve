---
page: edge-definitions
---

## A description's first-block plus leaves its paragraph open for the next entry

A `: +` description takes one block at column 0, and the lines after it read as they would after `: a` (PART 2 `: +` note, CARVE-P2-016, CARVE-P9-067). A `: ` line at the list's marker column is the next description (carve#4179), and a list marker below the body column is paragraph text, because a description body is not a list item (PART 0 S3). Inside a list item the same two descriptions open in the item.

::: compare

```carve
:: t
: +
after
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>after</dd>
  <dd>b</dd>
</dl>
```

:::

::: compare

```carve
:: t
: +
after
- y
```

```html
<dl>
  <dt>t</dt>
  <dd>after
- y</dd>
</dl>
```

:::

::: compare

```carve
> :: t
> : +
> after
> - y
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>after
- y</dd>
  </dl>
</blockquote>
```

:::

::: compare

```carve
- x

  :: t
  : +
  after
  : b
```

```html
<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>after</dd>
      <dd>b</dd>
    </dl>
  </li>
</ul>
```

:::

A shifted `: ` line between the columns of two description lists misses the nested body and reaches the outer list, whose body is open, so it is the outer list's next description (CARVE-P0-024 S3, carve#4180 ruling C, carve#4189).

::: compare

```carve
:: t
: d
  :: u
  : v
 : e
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <dl>
      <dt>u</dt>
      <dd>v</dd>
    </dl>
  </dd>
  <dd>e</dd>
</dl>
```

:::
