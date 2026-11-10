---
page: edge-definitions
---

## A description keeps a note follower after a refused run

The brace opener is literal. The following note definition is read normally outside the description (CARVE-P2-035, carve#5830).

::: compare

```carve
:: t
: {.x
}
[^m]: n
z
```

```html
<dl>
  <dt>t</dt>
  <dd>{.x
}</dd>
</dl>
```

:::
