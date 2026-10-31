---
page: edge-lists
---

## A paragraph a lone plus attaches stays the item's open paragraph

PART 9 §17 L3 and PART 0 S4 (carve#4208). The paragraph a `+` at the item's marker column attaches is the item's open paragraph: a sibling marker interrupts it, and a block at the content column opens in the item.

:::::: compare

`````carve
- a
+
q
 - c
`````

```html
<ul>
  <li>a
    q
  </li>
  <li>c</li>
</ul>
```

::::::

:::::: compare

`````carve
- a
+
q
  # h
`````

```html
<ul>
  <li>a
    q
    <h1 id="h">h</h1>
  </li>
</ul>
```

::::::
