---
page: edge-lists
---

## A nested refused plus keeps its item

A refused marker after a nested item's open fence changes no owner. The following line reaches the same inner item (CARVE-P9-067, carve#5637 ruling).

:::::: compare

`````carve
- - ```
  +

    x
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
        <p>x</p>
      </li>
    </ul>
  </li>
</ul>
```

::::::
