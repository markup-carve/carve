---
page: edge-lists
---

## A comment does not split a nested list boundary

PART 9 §11 N1a and PART 0 S1 (carve#4760). A nested list reads the full blank run after a comment is erased. Three or more blanks before the next marker start a new sibling list at that level.

:::::: compare

`````carve
- o
  - a



  %% c

  - b
`````

```html
<ul>
  <li>o
    <ul>
      <li>a</li>
    </ul>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

::::::

The same boundary holds when the comment divides the run after two blanks.

:::::: compare

`````carve
- o
  - a


  %% c

  - b
`````

```html
<ul>
  <li>o
    <ul>
      <li>a</li>
    </ul>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

::::::
