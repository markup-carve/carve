---
page: edge-lists
---

## A fence after an attached description blank opens in the description

The blank ends the fence attached by the marker-line `+` (PART 0 S1 step 3). A later fence at or past the description's content column opens a new block in that description (PART 0 S3, CARVE-P0-024; carve#5640). Its authored extra indentation does not turn the opener into inline text.

::: compare

````carve
:: t
: +
```
a

   ```
zz
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>a
</code></pre>
    <pre><code></code></pre>
  </dd>
</dl>
<p>zz</p>
```

:::
