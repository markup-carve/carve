---
page: edge-lists
---

## A region marker between items splits the list

PART 11 CARVE-P11-073(a) makes a region marker at the list's column a sibling
of that list. PART 9 §11 N1 cannot join items across that sibling.

::: compare

```carve
- a
%% #region x
- b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::
