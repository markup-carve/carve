---
page: edge-definitions
---

## A description's one attributed paragraph keeps its p

A description body that holds one attributed paragraph renders it as `<p>` with the attributes, as a tight item does. An unattributed one stays bare (CARVE-P9-081, carve#4309).

:::: compare

```carve
:: T
: {.c}
  q
```

```html
<dl>
  <dt>T</dt>
  <dd><p class="c">q</p></dd>
</dl>
```

::::

:::: compare

```carve
:: T
: +
{#d}
q

:: U
: r
```

```html
<dl>
  <dt>T</dt>
  <dd><p id="d">q</p></dd>
  <dt>U</dt>
  <dd>r</dd>
</dl>
```

::::
