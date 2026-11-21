---
page: edge-footnotes
---

## A column-0 line after a nested note and an unclosed div leaves the description

A frame without its closer ends at its host boundary (`14:449`, carve#4736). The div belongs to the outer note, which holds no paragraph, so the line leaves the description.

::: compare

```carve
:: t
: [^1]: :
    [^4]: p
    ::::
z
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>z</p>
```

:::

::: compare

```carve
:: t
: [^1]: :
    [^4]: p
    ::::
- z
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<ul>
  <li>z</li>
</ul>
```

:::
