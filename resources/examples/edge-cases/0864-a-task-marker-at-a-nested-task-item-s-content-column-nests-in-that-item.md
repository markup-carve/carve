---
page: edge-lists
---

## A task marker at a nested task item's content column nests in that item

PART 0 S3 and rule A (carve#4011). A list marker at a task item's content column opens a child list in that item; the marker-line children of the outer task items take no part.

:::::: compare

`````carve
- [ ] - a
  - [ ] - b
    - [ ] c
      - [ ] d
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <ul>
      <li>a</li>
    </ul>
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <ul>
          <li>b</li>
        </ul>
        <ul class="task-list">
          <li><input type="checkbox" disabled aria-label="c"> c
            <ul class="task-list">
              <li><input type="checkbox" disabled aria-label="d"> d</li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::::

Without the outer level the line nests the same way.

:::::: compare

`````carve
- [ ] - b
  - [ ] c
    - [ ] d
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <ul>
      <li>b</li>
    </ul>
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="c"> c
        <ul class="task-list">
          <li><input type="checkbox" disabled aria-label="d"> d</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::::
