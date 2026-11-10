---
page: edge-definitions
---

## A description sibling bounds an unclosed comment run

An unclosed marker-line comment run remains literal paragraph text through its description. A later description cannot supply its closer or change the earlier description's text (CARVE-P2-035, PART 0 L2, carve#5818).

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
  <dd>{% a
{k=v}</dd>
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
  <dd>{% a
{k=v}</dd>
  <dd>next
z %} y</dd>
</dl>
```

:::
