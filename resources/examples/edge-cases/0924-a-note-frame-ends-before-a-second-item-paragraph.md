---
page: edge-lists
---

## A note frame ends before a second item paragraph

PART 9 §17 L1 and L1b (carve#4785). Invisible definitions before the first paragraph do not make it loose. Once that first visible paragraph ends, its blank-separated successor loosens the item, even when the successor is overindented.

:::::: compare

`````carve
- [r]: /u
  [^f]: a

  x

    y
`````

```html
<ul>
  <li><p>x</p>
    <p>y</p>
  </li>
</ul>
```

::::::
