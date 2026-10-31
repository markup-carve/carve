---
page: edge-lists
---

## A line below a bare run a paragraph absorbed in a div folds into it

CARVE-P9-016 and PART 0 S4 (carve#4415). The paragraph absorbs the bare run of another width and stays open, so the line below folds into it.

:::::: compare

`````carve
- :::
  :::e
  ::::
l
`````

```html
<ul>
  <li>
    <div>
      <p>:::e
::::
l</p>
    </div>
  </li>
</ul>
```

::::::

One level deeper, after a paragraph.

:::::: compare

`````carve
- o

  :::
  :::e
  ::::
l
`````

```html
<ul>
  <li>o
    <div>
      <p>:::e
::::
l</p>
    </div>
  </li>
</ul>
```

::::::
