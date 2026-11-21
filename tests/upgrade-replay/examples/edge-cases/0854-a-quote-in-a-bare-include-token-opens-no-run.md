---
page: edge-inline
---

## A quote in a bare include token opens no run

PART 6: only a quoted path or a quoted option value holds the closer (carve#4462).

:::: compare

````carve
{{ it's_x @lines:0-1 }} it's_y }}
````

```html
<p>{{ it's_x @lines:0-1 }} it’s_y }}</p>
```

::::
