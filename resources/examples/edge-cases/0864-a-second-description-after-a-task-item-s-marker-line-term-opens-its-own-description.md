---
page: edge-definitions
---

## A second description after a task item's marker-line term opens its own description

CARVE-P0-008 (carve#4094). The checkbox is content, so the term sits at column 6, and `: b` at that column opens the next description.

:::::: compare

`````carve
- [ ] :: t
      : a
      : b
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <dl>
      <dt>t</dt>
      <dd>a</dd>
      <dd>b</dd>
    </dl>
  </li>
</ul>
```

::::::
