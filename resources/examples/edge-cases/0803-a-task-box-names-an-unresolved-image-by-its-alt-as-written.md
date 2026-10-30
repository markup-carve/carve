---
page: edge-lists
---

## A task box names an unresolved image by its alt as written

A task box's `aria-label` is the derived text of the item's first block, and an image contributes its alt as written, markup and all, whether or not its reference resolves (CARVE-P2-015, carve#4158). The item still shows the unresolved image as literal text.

::: compare

```carve
- [ ] ![x][r]
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="x"> ![x][r]</li>
</ul>
```

:::

::: compare

```carve
- [ ] ![/x/ y][r] z
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="/x/ y z"> ![/x/ y][r] z</li>
</ul>
```

:::
