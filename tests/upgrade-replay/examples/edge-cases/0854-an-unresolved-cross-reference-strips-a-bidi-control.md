---
page: edge-links
---

## An unresolved cross-reference strips a bidi control

CARVE-P9-058 strips U+202A to U+202E from rendered text (carve#4460).

:::: compare

````carve
</#a‮>
````

```html
<p>&lt;/#a&gt;</p>
```

::::
