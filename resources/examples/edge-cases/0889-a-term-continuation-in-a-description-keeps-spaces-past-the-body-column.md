---
page: edge-definitions
---

## A term continuation in a description keeps spaces past the body column

CARVE-P9-083 (carve#4737). A term continuation keeps its indentation relative to its frame. In a description body the marker-line content stands at the body column, so a continuation line at that column keeps no spaces, as `:: t` over `u` does at the top.

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
      <dt>t
u</dt>
    </dl>
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
      <dt>t
  u</dt>
    </dl>
  </dd>
</dl>
````

:::
