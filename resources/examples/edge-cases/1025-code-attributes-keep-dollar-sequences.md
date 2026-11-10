---
page: edge-inline
---

## Code attributes keep dollar sequences

A quoted attribute value stays literal when it is attached to a code span (PART 4 `quoted_value`; carve#5668).

:::: compare

```carve
`b`{k="$`"}
```

```html
<p><code k="$`">b</code></p>
```

::::
