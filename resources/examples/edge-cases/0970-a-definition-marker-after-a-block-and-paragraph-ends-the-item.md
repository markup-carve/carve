---
page: edge-lists
---

## A definition marker after a block and paragraph ends the item

PART 0 S4 (definition-body `markers`). A later block ends a term-only definition list. A description-shaped line on the item's marker column then folds into the open paragraph.

::: compare

```carve
- a
  :: t
  # H
  w
: z
```

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
    </dl>
    <h1 id="H">H</h1>
    w
: z
  </li>
</ul>
```

:::
