---
page: edge-lists
---

## A refused plus before an attribute run and a sibling is a letter

The sibling test reads the block the run leads (CARVE-P9-067, carve#4447), so neither the `+` nor the attribute line is lost.

::: compare

```carve
- a
+
{x}
- c
```

```html
<ul>
  <li>a
+</li>
</ul>
<ul x="">
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- +
{x}
- c
```

```html
<ul>
  <li>+</li>
</ul>
<ul x="">
  <li>c</li>
</ul>
```

:::

A description reads a `: ` sibling behind the run the same way (CARVE-P9-085).

::: compare

```carve
:: t
: a
+
{x}
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>a
+</dd>
</dl>
<p x="">: b</p>
```

:::

::: compare

```carve
:: t
: +
{x}
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>+</dd>
</dl>
<p x="">: b</p>
```

:::

A description takes a list, so the run still leads it there.

::: compare

```carve
:: t
: a
+
{x}
  - c
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <ul x="">
      <li>c</li>
    </ul>
  </dd>
</dl>
```

:::
