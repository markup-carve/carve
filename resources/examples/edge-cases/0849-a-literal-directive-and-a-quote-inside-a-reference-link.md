---
page: edge-links
---

## A literal directive and a quote inside a reference link

A literal include directive is emitted as its source text, so a reference link around it still pairs across it (CARVE-P6-001, markup-carve/carve#4426).

::: compare

```carve
[a {{ x @lines:0 }} b][r]

[r]: /r
```

```html
<p><a href="/r">a {{ x @lines:0 }} b</a></p>
```

:::

A reference link in a reference link keeps only its text, and the literal or a quote in that text reads as it does one level up.

::: compare

```carve
[a [b {{ x @lines:0 }}][r] c][r]

[r]: /r
```

```html
<p><a href="/r">a b {{ x @lines:0 }} c</a></p>
```

:::

::: compare

```carve
[a [b "c"][r] d][r]

[r]: /r
```

```html
<p><a href="/r">a b “c” d</a></p>
```

:::
