---
page: edge-lists
---

## A later fence opener ends a description after a refused run

The refused brace opener is literal. Both following fence openers are read by ordinary fence and attachment rules (CARVE-P2-035, carve#5830).

::: compare

````carve
:: t
: +
{.x
.y}
```
wa
```
```
````

```html
<dl>
  <dt>t</dt>
  <dd>{.x
.y}</dd>
</dl>
<pre><code>wa
</code></pre>
<pre><code></code></pre>
```

:::
