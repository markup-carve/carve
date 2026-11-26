---
page: edge-lists
---

## An outer item's paragraph after a nested attached fence loosens it

PART 9 §17 L1. The nested list is a visible block of the outer item. The blank after its attached fence separates it from the outer item's paragraph, so the outer item is loose.

::: compare

````carve
- - +
  ```

  tail
    ```
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    <p>tail
<code></code></p>
  </li>
</ul>
```

:::
