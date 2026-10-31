---
page: edge-lists
---

## A longer bare colon run does not end a line block

CARVE-P9-016 and PART 0 S4 (carve#4113). Only an exact-width run closes the line block; a longer one is its text, and the line below continues it.

:::::: compare

`````carve
- m
  ::: |
  ::::
l
`````

```html
<ul>
  <li>m
    <div class="line-block">
      <p>::::<br>
l</p>
    </div>
  </li>
</ul>
```

::::::
