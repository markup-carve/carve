---
page: edge-lists
---

## A description lead under a marker-line child folds into its paragraph

A `: ` line at the outer item's content column reaches the outer item but not the child item on its marker line. With no term open it opens nothing, so PART 0 S4 folds it into the child's open paragraph and the child keeps the lines below (carve#4175). Under an open term the same line still ends the child (row 743).

:::: compare

```carve
- - a
  : b
    > q
```

```html
<ul>
  <li>
    <ul>
      <li>a
: b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
* 1. a
  : b
     > q
```

```html
<ul>
  <li>
    <ol>
      <li>a
: b
        <blockquote><p>q</p></blockquote>
      </li>
    </ol>
  </li>
</ul>
```

::::

:::: compare

```carve
- - a
  : b
  : c
    # h
```

```html
<ul>
  <li>
    <ul>
      <li>a
: b
: c
        <h1 id="h">h</h1>
      </li>
    </ul>
  </li>
</ul>
```

::::
