## A promoted image leaves the task checkbox unnamed

The first block renders as a block image, so it supplies no inline text beside the checkbox.

::: compare

```carve
- [ ] ![x](x)
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <img src="x" alt="x">
  </li>
</ul>
```

:::
