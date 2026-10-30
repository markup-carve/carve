---
page: edge-definitions
---

## A marker that misses a description folds into its item

A marker at column 0 reaches no frame of the description (PART 0 S2), so it is a lazy line of the item's open paragraph, as it is one column right.

::: compare

```carve
:: t
: - a
- b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
- b</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: 1. a
2. b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>a
2. b</li>
    </ol>
  </dd>
</dl>
```

:::

A blank line ends the description first.

::: compare

```carve
:: t
: - a

- b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>b</li>
</ul>
```

:::
