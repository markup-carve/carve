---
page: edge-lists
---

## Text ending a nested span opens a paragraph in the surviving item

PART 0 S1 ends a comment span when a text line misses its owner's column. The line is then read in the surviving item and opens its paragraph. PART 0 S4 folds the next line into that paragraph, even if it misses every item column.

::: compare

```carve
- a
  - - %%%
    n
zz
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li></li>
        </ul>
        n
zz
      </li>
    </ul>
  </li>
</ul>
```

:::
