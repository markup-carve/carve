---
page: edge-lists
---

## A refused brace run keeps a following plus literal

The refused opener claims no later line. The following `+` is read by the ordinary attachment rule (CARVE-P2-035, carve#5830).

:::::: compare

`````carve
- +
{.x
.y}
+
  zq
`````

```html
<ul>
  <li>{.x
.y}
    zq
  </li>
</ul>
```

::::::
