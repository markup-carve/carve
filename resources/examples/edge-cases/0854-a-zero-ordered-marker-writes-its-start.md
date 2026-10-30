---
page: edge-lists
---

## A zero ordered marker writes its start

PART 9 §11 N2: `start` is omitted only when it is 1 (carve#4454).

:::: compare

````carve
0. a
1. b
````

```html
<ol start="0">
  <li>a</li>
  <li>b</li>
</ol>
```

::::

:::: compare

````carve
0) a
````

```html
<ol start="0" data-delim=")">
  <li>a</li>
</ol>
```

::::
