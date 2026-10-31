---
page: edge-lists
---

## A list marker between an item's columns is a sibling only on every axis

PART 0 S4, §11 N1 (carve#4545). Between an item's marker column and its content column a list marker is a sibling only when it matches the open list on every axis: bullet character, ordered type, delimiter, plain or task. Any other marker there is text of the open paragraph.

A marker that differs from the open list only in plain or task is no sibling, so it is text of the item's paragraph.

:::::: compare

`````carve
- a
 - [ ] b
`````

```html
<ul>
  <li>a
- [ ] b</li>
</ul>
```

::::::

:::::: compare

`````carve
- [ ] a
 - b
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a - b"> a
- b</li>
</ul>
```

::::::

A different ordered type is no sibling either: decimal, alphabetic and roman are three lists.

:::::: compare

`````carve
1. a
 a. b
`````

```html
<ol>
  <li>a
a. b</li>
</ol>
```

::::::

:::::: compare

`````carve
1. a
 i. b
`````

```html
<ol>
  <li>a
i. b</li>
</ol>
```

::::::

:::::: compare

`````carve
a. a
 1. b
`````

```html
<ol type="a">
  <li>a
1. b</li>
</ol>
```

::::::

Nested items read the same way.

:::::: compare

`````carve
- x
  - a
   - [ ] b
`````

```html
<ul>
  <li>x
    <ul>
      <li>a
- [ ] b</li>
    </ul>
  </li>
</ul>
```

::::::

A marker that matches on every axis is still a sibling.

:::::: compare

`````carve
- [ ] a
 - [x] b
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a"> a</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="b"> b</li>
</ul>
```

::::::

At the list's marker column every such marker opens a new list.

:::::: compare

`````carve
- a
- [ ] b
`````

```html
<ul>
  <li>a</li>
</ul>
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="b"> b</li>
</ul>
```

::::::
