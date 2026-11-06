---
page: edge-lists
---

## A block at a pulled description column opens in the description

PART 0 CARVE-P0-011 ends a pulled paragraph when a block reaches the description's content column. A later column-zero line leaves the description after the heading closes its paragraph.

::: compare

```carve
:: t
: +
h
  # H
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>h</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: +
h
  # H
z
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>h</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
<p>z</p>
```

:::

::: compare

```carve
- item

  :: t
  : +
  h
    # H
z
```

```html
<ul>
  <li><p>item</p>
    <dl>
      <dt>t</dt>
      <dd>
        <p>h</p>
        <h1 id="H">H</h1>
      </dd>
    </dl>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

```carve
- item
  - item

    :: t
    : +
    h
      # H
z
```

```html
<ul>
  <li>item
    <ul>
      <li><p>item</p>
        <dl>
          <dt>t</dt>
          <dd>
            <p>h</p>
            <h1 id="H">H</h1>
          </dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
<p>z</p>
```

:::
