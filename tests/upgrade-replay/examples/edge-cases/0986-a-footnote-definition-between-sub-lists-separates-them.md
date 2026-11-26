---
page: edge-lists
---

## A footnote definition between sub-lists separates them

PART 9 §17 L1 says a blank before a different list stands between two of the item's own blocks and loosens the item. CARVE-P9-013 makes a footnote definition invisible where it stands. At the child list's marker column, the definition ends that list, so the marker after the blank starts a second child list.

::: compare

````carve
- a
  - b
  [^n]: t

  - c
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
    <ul>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::
