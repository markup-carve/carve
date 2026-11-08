---
page: edge-lists
---

## A top-level sibling marker in an unclosed attached fence is payload

The #5499 reading holds at the top level too: a sibling marker inside an unclosed fence that a marker-line `+` attached is code, whether or not a blank follows later (carve#5531).

::: compare

````carve
- +
```
- z

q
````

```html
<ul>
  <li>
    <pre><code>- z
</code></pre>
  </li>
</ul>
<p>q</p>
```

:::
