---
page: edge-lists
---

## A quote prefix on a comment continuation counts at its marker

A continuation of an item's comment run that carries a quote prefix at the opening brace's column refuses the run (CARVE-P2-035, carve#5787).

::: compare

```carve
- {% a
  >  b %}
```

```html
<ul>
  <li>{% a
&gt;  b %}</li>
</ul>
```

:::
