---
page: edge-lists
---

## A list marker between an item's columns is a sibling only on every axis

PART 0 S3 and S4, §11 N1 (carve#4545, superseding ruling). The section name predates that ruling and is append-only. Between an item's marker column and its content column a list marker reads as it would at the marker column: a sibling when it matches the open list on every axis (bullet character, ordered type, delimiter, plain or task), otherwise a new list.

A marker that differs from the open list only in plain or task opens a new list.

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

:::::: compare

`````carve
- [ ] a
 - b
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a"> a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

::::::

A different ordered type opens a new list too: decimal, alphabetic and roman are three lists.

:::::: compare

`````carve
1. a
 a.  b
`````

```html
<ol>
  <li>a</li>
</ol>
<ol type="a">
  <li>b</li>
</ol>
```

::::::

:::::: compare

`````carve
1. a
 i.  b
`````

```html
<ol>
  <li>a</li>
</ol>
<ol type="i">
  <li>b</li>
</ol>
```

::::::

:::::: compare

`````carve
a.  a
 1. b
`````

```html
<ol type="a">
  <li>a</li>
</ol>
<ol>
  <li>b</li>
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
      <li>a</li>
    </ul>
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="b"> b</li>
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
