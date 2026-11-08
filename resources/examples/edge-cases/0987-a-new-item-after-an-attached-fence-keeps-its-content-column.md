---
page: edge-lists
---

## A new item after an attached fence keeps its content column

PART 9 §17 L3 bounds the unclosed fence at the sibling marker. PART 9 §24 C3 then places a later line that reaches the new item's content column inside that item. The blank separates its two paragraphs, so the item is loose.

::: compare

````carve
1. +
```
- z

  y
````

```html
<ol>
  <li>
    <pre><code></code></pre>
  </li>
</ol>
<ul>
  <li><p>z</p>
    <p>y</p>
  </li>
</ul>
```

:::
