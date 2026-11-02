---
page: edge-definitions
---

## A marker below a description body continues its open paragraph


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

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
      <li>x</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>y</li>
</ul>
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
      <li>x</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>y</li>
</ul>
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
      <li>x</li>
    </ul>
  </dd>
</dl>
<ol>
  <li>y</li>
</ol>
```

:::
