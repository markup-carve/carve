## A resolved reference image also leaves the checkbox unnamed

Promotion uses the resolved image, including a definition written after the task item.

::: compare

```carve
- [ ] ![x][r]

[r]: x
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <img src="x" alt="x">
  </li>
</ul>
```

:::
