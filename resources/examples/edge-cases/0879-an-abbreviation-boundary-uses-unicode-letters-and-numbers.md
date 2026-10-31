---
page: edge-inline
---

## An abbreviation boundary uses Unicode letters and numbers

PART 9R R3. A neighbouring Unicode letter or number blocks an abbreviation
match on that side. The ASCII-only emphasis guard does not apply.

::: compare

```carve
*[HTML]: Hypertext

αHTMLβ HTML αHTML HTMLβ ２HTML
```

```html
<p>αHTMLβ <abbr title="Hypertext">HTML</abbr> αHTML HTMLβ ２HTML</p>
```

:::
