---
page: edge-definitions
---

## A description sibling is recognized at any column

A `: ` line is a sibling description at any column, the way a bullet sibling is (CARVE-P0-024 S3, carve#4180): where the owner S2 selects holds an open term or description, the line opens the next description of that list and is not a lazy line. A line at or past an open description's body column is read inside that body. A line whose owner is not the list's owner still folds lazily.

::: compare

```carve
:: t
 :: u
: d
 : e
```

```html
<dl>
  <dt>t</dt>
  <dt>u</dt>
  <dd>d</dd>
  <dd>e</dd>
</dl>
```

:::

::: compare

```carve
:: t
: a
 : b
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dd>b</dd>
</dl>
```

:::

::: compare

```carve
:: t
: a
  : b
```

```html
<dl>
  <dt>t</dt>
  <dd>a
: b</dd>
</dl>
```

:::

::: compare

```carve
:: t
:  a
  : b
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dd>b</dd>
</dl>
```

:::

::: compare

```carve
  :: t
  : a
 : b
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dd>b</dd>
</dl>
```

:::

::: compare

```carve
:: outer
:  :: inner
   : a
  : b
```

```html
<dl>
  <dt>outer</dt>
  <dd>
    <dl>
      <dt>inner</dt>
      <dd>a</dd>
    </dl>
  </dd>
  <dd>b</dd>
</dl>
```

:::

::: compare

```carve
- item
  :: t
  : a
 : b
```

```html
<ul>
  <li>item
    <dl>
      <dt>t</dt>
      <dd>a
: b</dd>
    </dl>
  </li>
</ul>
```

:::
