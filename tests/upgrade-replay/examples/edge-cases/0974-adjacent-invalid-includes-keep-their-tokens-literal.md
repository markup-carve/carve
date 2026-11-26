---
page: edge-inline
---

## Adjacent invalid includes keep their tokens literal

An invalid `@lines` directive emits its source without parsing its backtick. That backtick cannot open a code span that breaks the next invalid directive (CARVE-P6-001).

:::: compare

```carve
{{ `@lines:1 }}{{ `@lines:1 }}
```

```html
<p>{{ `@lines:1 }}{{ `@lines:1 }}</p>
```

::::
