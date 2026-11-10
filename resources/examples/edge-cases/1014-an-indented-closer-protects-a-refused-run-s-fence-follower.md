---
page: edge-lists
---

## An indented closer protects a refused run's fence follower

The brace opener is literal and the following fence opens separately. Its indented closer is payload because it misses the fence closer column (CARVE-P2-035, carve#5830).

::: compare

````carve
{.x
.y}
```
wa
> q
  ```
````

````html
<p>{.x
.y}</p>
<pre><code>wa
&gt; q
  ```
</code></pre>
````

:::
