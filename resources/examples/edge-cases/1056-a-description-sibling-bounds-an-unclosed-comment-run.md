---
page: edge-definitions
---

## A description sibling bounds an unclosed comment run

An unclosed marker-line comment opener is literal text. The following attribute line is read normally, and a later description cannot supply the comment closer (CARVE-P2-035, PART 0 L2, carve#5830).

::: compare

```carve
:: t
:   {% a
     {k=v}
: next
```

```html
<dl>
  <dt>t</dt>
  <dd>{% a</dd>
  <dd>next</dd>
</dl>
```

:::

::: compare

```carve
:: t
:   {% a
     {k=v}
: next
z %} y
```

```html
<dl>
  <dt>t</dt>
  <dd>{% a</dd>
  <dd>next
z %} y</dd>
</dl>
```

:::
