---
page: edge-attributes
---

## A single-quoted value holds a closing brace on a block attribute line

PART 4 `quoted_value` has both quote forms (carve#4459).

:::: compare

````carve
{k='x}y'}
p
````

```html
<p k="x}y">p</p>
```

::::
