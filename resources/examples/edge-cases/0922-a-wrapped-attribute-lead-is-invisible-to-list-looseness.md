---
page: edge-lists
---

## A wrapped attribute lead is invisible to list looseness

PART 9 §17 L1a and L1b (CARVE-P9-029, CARVE-P9-030; carve#4758) treat a valid wrapped attribute as one invisible lead. A run whose continuation fails CARVE-P2-035 is visible paragraph text instead. The examples below retain that historical input and show the new reading.

:::::: compare

`````carve
- {x
  y}

  b
- a
`````

```html
<ul>
  <li><p>{x
y}</p>
    <p>b</p>
  </li>
  <li><p>a</p></li>
</ul>
```

::::::

The same rule applies to an ordered list with a wider content column.

:::::: compare

`````carve
1. {x
   y}

   b
2. a
`````

```html
<ol>
  <li><p>{x
y}</p>
    <p>b</p>
  </li>
  <li><p>a</p></li>
</ol>
```

::::::
