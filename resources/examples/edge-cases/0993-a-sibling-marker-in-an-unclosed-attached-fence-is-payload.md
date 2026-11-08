---
page: edge-fences
---

## A sibling marker in an unclosed attached fence is payload

PART 0 S1 keeps a sibling marker inside an unclosed attached fence until the first blank. A later blank does not change how the marker line is read (carve#5499).

::: compare

````carve
- - +
  ```
  - z

q
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>- z
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>q</p>
```

:::
