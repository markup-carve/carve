---
page: edge-footnotes
---

## A lazy line after a double-plus note has no sentinel

A lazy line folds into the paragraph as its own text (PART 9 §10 I5/I6). A quote marker synthesized while finding a missed note does not become text, and the lazy-line frame is internal.

::: compare

```carve
[^a]: +
+

  > q
lazy
```

```html
<p>&gt; q
lazy</p>
```

:::
::: compare

```carve
[^a]: +
+

  [^b]: > q
lazy
```

```html
<p>[^b]: &gt; q
lazy</p>
```

:::
