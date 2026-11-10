---
page: edge-lists
---

## A quoted marker comment at the opener column stays text

A quote that opens on an item's marker line measures the comment opener and each continuation after its quote prefix. A continuation at the opening brace's column refuses the run (CARVE-P2-035, carve#5787).

::: compare

```carve
 - > {% a
   > b
   > z %}
```

```html
<ul>
  <li>
    <blockquote><p>{% a
b
z %}</p></blockquote>
  </li>
</ul>
```

:::
