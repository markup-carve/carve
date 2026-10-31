---
page: edge-lists
---

## Every folded caret line loses its leading whitespace in a deep term

PART 0 S4 and carve#4502.

::: compare

````carve
- [ ] - [ ] :: t
      ^ ap
     ^ cap
````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <dl>
          <dt>t
^ ap
^ cap</dt>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::
