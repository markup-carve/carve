---
page: edge-lists
---

## An outer quote prefix width does not move a comment continuation

The opener and the continuation are measured after the outer quote prefix of their own line. The continuation stands left of the opening brace there, so the run is text (CARVE-P2-035, carve#5787).

::: compare

```carve
> - {% a
  >  b %}
```

```html
<blockquote>
  <ul>
    <li>{% a
b %}</li>
  </ul>
</blockquote>
```

:::
