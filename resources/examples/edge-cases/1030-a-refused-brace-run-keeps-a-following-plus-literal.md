---
page: edge-lists
---

## A refused brace run keeps a following plus literal

A refused brace run keeps the immediately following marker-column `+` as literal paragraph text (CARVE-P2-035, carve#5658 R03 ruling).

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
+
zq</li>
</ul>
```

::::::
