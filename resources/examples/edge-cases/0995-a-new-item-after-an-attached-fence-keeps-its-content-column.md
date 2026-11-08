---
page: edge-lists
---

## A new item after an attached fence keeps its content column

The fence stands at the marker column of a one-level `+`, so the marker of the other list, with a blank below it, ends the unclosed fence (carve#5509; the carve#5499 ruling covers a fence right of its `+`'s line). PART 9 §24 C3 then places a later line that reaches the new item's content column inside that item. The blank separates its two paragraphs, so the item is loose.

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
