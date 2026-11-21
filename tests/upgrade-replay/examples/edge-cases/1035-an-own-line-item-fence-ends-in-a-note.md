---
page: edge-containers
---

## An own-line item fence ends in a note

A line that misses the item ends its own-line attachment even when a later shifted run resembles a closer (PART 0 S1 step 2, carve#5658 F06 ruling).

:::::: compare

`````carve
::: note
- x
+
```

b
  ```
:::
`````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>x
      <pre><code>
</code></pre>
    </li>
  </ul>
  <p>b</p>
  <pre><code></code></pre>
</aside>
```

::::::
