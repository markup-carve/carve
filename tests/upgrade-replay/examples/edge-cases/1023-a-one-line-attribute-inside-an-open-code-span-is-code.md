---
page: edge-lists
---

## A one-line attribute inside an open code span is code

A block-shaped brace line inside the paragraph's open inline code span stays code text, at any column (CARVE-P2-035, carve#5638).

::: compare

````carve
p
`open
{.x}
close`
z
````

```html
<p>p
<code>open
{.x}
close</code>
z</p>
```

:::
