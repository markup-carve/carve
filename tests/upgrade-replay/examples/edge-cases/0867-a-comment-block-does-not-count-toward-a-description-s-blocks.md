---
page: edge-definitions
---

## A comment block does not count toward a description's blocks

CARVE-P12-027 and CARVE-P9-013 (carve#4544). A description wraps its content by its count of rendered blocks. A comment block renders nothing, so a paragraph and a comment stay one block and render inline.

:::::: compare

`````carve
:: t
: x
  %% c
`````

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
```

::::::
