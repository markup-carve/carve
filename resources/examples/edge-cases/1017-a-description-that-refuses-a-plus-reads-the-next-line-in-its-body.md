---
page: edge-lists
---

## A description that refuses a plus reads the next line in its body

A refused `+` renders nothing, and the description that refused it stays open: the next line is read in its body, where a marker at its body column opens a block (CARVE-P9-067, carve#5608).

::: compare

````carve
:: t
: +
1. li
+
  - sib
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>li</li>
    </ol>
    <ul>
      <li>sib</li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

````carve
:: t
: +
1. li
+
- sib
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>li</li>
    </ol>
    <ul>
      <li>sib</li>
    </ul>
  </dd>
</dl>
```

:::
