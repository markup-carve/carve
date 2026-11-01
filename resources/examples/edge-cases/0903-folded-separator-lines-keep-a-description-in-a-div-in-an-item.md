---
page: edge-definitions
---

## Folded separator lines keep a description in a div in an item

CARVE-P9-083 (carve#4739). A `:` line folded into a description paragraph opens no sibling, so a later line at the body column stays in that body, however many folded lines come before it.

::: compare

```carve
- :::
  :: t
  : t
      : e
      : f
      :: u
```

```html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>
          <p>t
: e
: f</p>
          <dl>
            <dt>u</dt>
          </dl>
        </dd>
      </dl>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
- :::
  :: t
  : e
  x
  : f
    :: u
```

```html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>e
x</dd>
        <dd>
          <p>f</p>
          <dl>
            <dt>u</dt>
          </dl>
        </dd>
      </dl>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
- :::
  :: t
  : - t
    : e
    : f
    :: u
```

```html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>
          <ul>
            <li>t
: e
: f</li>
          </ul>
          <dl>
            <dt>u</dt>
          </dl>
        </dd>
      </dl>
    </div>
  </li>
</ul>
```

:::
