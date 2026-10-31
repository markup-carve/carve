---
page: edge-definitions
---

## A second description in an indented description list opens its own description

Description list rule (carve#4176). A `: ` separator at the indented term's column opens the next description of the same term.

:::::: compare

`````carve
 :: t
 : a
 : b
`````

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dd>b</dd>
</dl>
```

::::::
