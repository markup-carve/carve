---
page: edge-lists
---

## Markers of either kind stay payload in a chained fence

The `+` on a nested marker line attaches the fence, which stays open. PART 0 S1 ends it only at its closer, a nonblank line that misses its owner, or its first blank, so a marker of the item's own list and one of another list are both code, though a blank follows (carve#5499).

::: compare

````carve
- 1. +
  ```
  2. z
  - w

q
````

```html
<ul>
  <li>
    <ol>
      <li>
        <pre><code>2. z
- w
</code></pre>
      </li>
    </ol>
  </li>
</ul>
<p>q</p>
```

:::
