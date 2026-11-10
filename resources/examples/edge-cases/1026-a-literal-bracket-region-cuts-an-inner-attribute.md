---
page: edge-inline
---

## A literal bracket region cuts an inner attribute

The first `]` in the quoted value closes the outer bracket run. Its region boundary cuts the inner link's attribute candidate, which stays text (PART 9 §9; carve#5672).

:::: compare

```carve
[t[x](/u){title="]"}y](/z)
```

```html
<p>[t<a href="/u">x</a>{title=“]”}y](/z)</p>
```

::::
