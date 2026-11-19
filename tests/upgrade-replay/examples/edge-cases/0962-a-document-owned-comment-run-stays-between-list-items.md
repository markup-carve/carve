---
page: edge-lists
---

## A document-owned comment run stays between list items

CARVE-P11-079 (b) keeps each document-owned `%%` line between the list items it separates. The lines form one comment block even when the run crosses an ownership boundary, as in row 945. The canonical spelling below preserves the one loose list under PART 11 §1.

::: compare

```carve
- a
%% c1

- b
%% c2

- c
%% c3
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
  <li><p>c</p></li>
</ul>
```

:::
