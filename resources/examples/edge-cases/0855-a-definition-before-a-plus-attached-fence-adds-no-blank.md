---
page: edge-lists
---

## A definition before a plus-attached fence adds no blank

A definition leaves no trace (§10 I5), so the separator after the block stays out of a fence the block leaves open.

::: compare

````carve
- a
+
[r]: /u
```
x
````

```html
<ul>
  <li>a
    <pre><code>x
</code></pre>
  </li>
</ul>
```

:::
