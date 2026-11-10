---
page: edge-lists
---

## A description plus after a blank reaches its host

A lone `+` at a description's marker column reaches it after a blank and attaches the next block (PART 9 §17 L3/L4, carve#5639).

:::::: compare

`````carve
:: t
: h

+
pp
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>h</p>
    <p>pp</p>
  </dd>
</dl>
```

::::::
