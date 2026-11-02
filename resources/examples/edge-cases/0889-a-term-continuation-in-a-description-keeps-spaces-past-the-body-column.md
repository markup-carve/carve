---
page: edge-definitions
---

## A term continuation in a description keeps spaces past the body column

CARVE-P9-083 (carve#4861). A term is one line, so a line after a term in a description body is a paragraph in the body, measured from the body column.

::: compare

````carve
:: t
: :: t
  u
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>t</dt>
    </dl>
    <p>u</p>
  </dd>
</dl>
````

:::

::: compare

````carve
:: t
: :: t
    u
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>t</dt>
    </dl>
    <p>u</p>
  </dd>
</dl>
````

:::
