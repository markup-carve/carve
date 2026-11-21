---
page: edge-lists
---

## A cross-reference ID is atomic inside a forced span

Pass P1 takes a cross-reference before pass P2 pairs the forced superscript (PART 9 §9, carve#5669). Its ID punctuation cannot consume the superscript closer.

::: compare

````carve
{^</#{^>^}
````

```html
<p><sup>&lt;/#{^&gt;</sup></p>
```

:::
