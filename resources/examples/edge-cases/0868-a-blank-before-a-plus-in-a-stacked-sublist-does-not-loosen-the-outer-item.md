---
page: edge-lists
---

## A blank before a plus in a stacked sublist does not loosen the outer item

PART 9 §17 L1 and L3 (carve#322, carve#4398). A blank inside a sublist does not loosen an ancestor, and the blank before a `+` does not loosen.

:::::: compare

`````carve
- a
  - - x

    +
    y
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li>x
            y
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::::
