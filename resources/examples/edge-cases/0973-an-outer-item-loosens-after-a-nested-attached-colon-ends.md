---
page: edge-lists
---

## An outer item loosens after a nested attached colon ends

### A quote after the note belongs to the outer item (carve#5393)

::::: compare

```carve
- a
  * +
  ::: note

  > q
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>
        <aside class="admonition note" aria-label="Note">

        </aside>
      </li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::::
