---
page: edge-definitions
---

## A description keeps a note follower after a refused run

A continuation at the opening brace refuses the attribute run. The next note-shaped line remains text in the description paragraph (CARVE-P2-035, PART 0 S4, carve#5772).

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
}
[^m]: n
z</dd>
</dl>
```

:::
