---
page: edge-definitions
---

## A marker below a description body continues its open paragraph

PART 0 S4 (carve#4738). A marker left of the `dd` content column is no sibling of a list inside the `dd`, so with a paragraph open it folds as text, whatever block came before the list.

::: compare

```carve
:: t
: :: t
  - x
- y
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>t</dt>
    </dl>
    <ul>
      <li>x
- y</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: :: t
  - x
* y
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>t</dt>
    </dl>
    <ul>
      <li>x
* y</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: # h
  - x
1. y
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <h1 id="h">h</h1>
    <ul>
      <li>x
1. y</li>
    </ul>
  </dd>
</dl>
```

:::
