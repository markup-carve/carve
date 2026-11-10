---
page: edge-lists
---

## A description keeps lazy text after a refused fence

The refused brace opener is literal. Its fence-shaped follower opens a separate code block, and the later column-zero line is read normally (CARVE-P2-035, carve#5830).

::: compare

````carve
:: t
: {.x
  }
  ```
plain
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>{.x
}</p>
    <pre><code></code></pre>
  </dd>
</dl>
<p>plain</p>
```

:::
