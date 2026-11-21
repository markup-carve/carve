---
page: edge-lists
---

## An attribute at an attached task quote column applies to its paragraph

After `> +` in a task item, the quote's marker column reads an attribute line at the same column as a heading.

::: compare

```carve
- [ ] > +
      {.c}
      p
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <blockquote><p class="c">p</p></blockquote>
  </li>
</ul>
```

:::
