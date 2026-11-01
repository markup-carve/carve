---
page: edge-inline
---

## A failed cross-line reference label stays verbatim

PART 3 CARVE-P3-004. A reference label that crosses a line and fails to pair or resolve is emitted as written. Neither the collapsed nor the explicit form rescans its inner markers.

::: compare

```carve
[*x*
y][]

[*x* y]: /u

[*z*
w][missing]
```

```html
<p>[*x*
y][]</p>
<p>[*z*
w][missing]</p>
```

:::
