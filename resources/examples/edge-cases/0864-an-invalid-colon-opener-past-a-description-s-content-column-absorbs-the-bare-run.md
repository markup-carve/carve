---
page: edge-definitions
---

## An invalid colon opener past a description's content column absorbs the bare run

CARVE-P9-016 and PART 0 S4 (carve#4112). The paragraph absorbs the invalid opener and the bare run, stays open, and takes the line below.

:::::: compare

`````carve
:: t
: m
   :::e
  :::
l
`````

```html
<dl>
  <dt>t</dt>
  <dd>m
:::e
:::
l</dd>
</dl>
```

::::::
