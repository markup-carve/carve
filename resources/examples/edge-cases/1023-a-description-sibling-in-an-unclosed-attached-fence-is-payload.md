---
page: edge-lists
---

## A description sibling in an unclosed attached fence is payload

PART 0 S1 gives the unclosed attached code fence every nonblank line at its content column, including a line shaped like a sibling description (carve#5640).

::: compare

````carve
:: t
: +
```
a
: dd
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>a
: dd
</code></pre>
  </dd>
</dl>
```

:::
