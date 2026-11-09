---
page: edge-lists
---

## A later fence opener ends a description after a refused run

The refused brace run keeps the first fence opener and its closer in the attached paragraph. The next opener begins a root code block (CARVE-P2-035, PART 9 §10 I4, carve#5593).

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
.y}
<code>
wa
</code></dd>
</dl>
<pre><code></code></pre>
```

:::
