---
page: edge-lists
---

## A plus at a stacked item's marker column reaches it

A lone `+` at the marker column of an open list item reaches that item, and the owner is the deepest frame reached (PART 0 S2, CARVE-P9-067, carve#4355). An item opened on its parent's marker line has a marker column like any other.

:::: compare

```carve
- - +
  +
  x
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
- - - +
  +
  x
```

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li></li>
        </ul>
        x
      </li>
    </ul>
  </li>
</ul>
```

::::
