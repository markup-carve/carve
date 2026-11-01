---
page: edge-lists
---

## Every list item measures its content against its own content column

PART 0 S4, PART 9 §11 N1 (carve#4369). A list marker of another kind at column 0 opens a new list, and a later block is owned by the item whose content column it reaches. The list before it does not change that reading. Between an item's marker and content columns a marker of another kind still folds.

:::::: compare

`````carve
- y
1. c

   # h
`````

```html
<ul>
  <li>y</li>
</ul>
<ol>
  <li>c
    <h1 id="h">h</h1>
  </li>
</ol>
```

::::::

:::::: compare

`````carve
- x

  10. y
  9. c

     # h
`````

```html
<ul>
  <li>x
    <ol start="10">
      <li>y</li>
      <li>c
        <h1 id="h">h</h1>
      </li>
    </ol>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- y
1. c
   [r]: /u

[x][r]
`````

```html
<ul>
  <li>y</li>
</ul>
<ol>
  <li>c</li>
</ol>
<p><a href="/u">x</a></p>
```

::::::

:::::: compare

`````carve
- x

  1. y
  - [ ] c
    # h
`````

```html
<ul>
  <li>x
    <ol>
      <li>y</li>
    </ol>
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="c"> c
        <h1 id="h">h</h1>
      </li>
    </ul>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- a
1. w
   - deep
`````

```html
<ul>
  <li>a</li>
</ul>
<ol>
  <li>w
    <ul>
      <li>deep</li>
    </ul>
  </li>
</ol>
```

::::::

:::::: compare

`````carve
- a
  * w
  1. v
    - u
`````

```html
<ul>
  <li>a
    <ul>
      <li>w</li>
    </ul>
    <ol>
      <li>v</li>
    </ol>
    <ul>
      <li>u</li>
    </ul>
  </li>
</ul>
```

::::::
