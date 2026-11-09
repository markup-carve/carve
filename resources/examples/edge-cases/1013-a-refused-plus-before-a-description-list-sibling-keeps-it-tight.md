---
page: edge-lists
---

## A refused plus before a description list sibling keeps it tight

The `+` offers a sibling of the list item. It is refused and adds no blank between the items (PART 9 §17 L1 and L3, CARVE-P9-067, carve#5616).

::: compare

````carve
:: t
: +
1. li
+
1. sib
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>li</li>
      <li>sib</li>
    </ol>
  </dd>
</dl>
```

:::
