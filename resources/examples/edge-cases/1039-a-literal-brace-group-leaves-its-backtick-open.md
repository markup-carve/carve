---
page: edge-definitions
---

## A literal brace group leaves its backtick open

The brace group does not attach to an inline host, so its backtick opens a code span across the next brace line (CARVE-P2-035, carve#5740).

::: compare

```carve
a{title="`"}
{k=v}
b
```

```html
<p>a{title=“<code>"}
{k=v}
b</code></p>
```

:::
