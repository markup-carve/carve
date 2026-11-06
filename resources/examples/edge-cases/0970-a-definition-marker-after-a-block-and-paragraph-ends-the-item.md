---
page: edge-lists
---

## A definition marker after a block and paragraph ends the item

PART 0 S4 (definition-body `markers`). A list item that holds a definition list ends at a description-shaped line on its marker column, even after a later block and paragraph.

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
  </li>
</ul>
<p>: z</p>
```

:::
