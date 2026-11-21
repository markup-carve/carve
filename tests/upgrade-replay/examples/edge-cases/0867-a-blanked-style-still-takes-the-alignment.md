---
page: edge-attributes
---

## A blanked style still takes the alignment

A text block's `align` is appended to its `style` after CARVE-P9-054 hardening, so a style value that hardening blanks still carries the `text-align` declaration, as a table cell's does (markup-carve/carve#4548).

::: compare

```carve
{style="url(x)" align=right}
p
```

```html
<p style="text-align: right;">p</p>
```

:::

The same holds for a heading and a div.

::: compare

```carve
{style="url(x)" align=center}
# h
```

```html
<section id="h">
  <h1 style="text-align: center;">h</h1>
</section>
```

:::

:::: compare

```carve
{style="url(x)" align=left}
::: d
q
:::
```

```html
<div class="d" style="text-align: left;">
  <p>q</p>
</div>
```

::::
