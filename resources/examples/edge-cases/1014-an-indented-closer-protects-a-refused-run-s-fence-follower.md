---
page: edge-lists
---

## An indented closer protects a refused run's fence follower

The brace opener is literal and the following fence opens separately. In 0.2, a four-backtick opener keeps the indented three-backtick run as payload because the run is shorter than the opener (CARVE-P2-035, carve#5830).

::: compare

`````carve
{.x
.y}
````
wa
> q
  ```
`````

````html
<p>{.x
.y}</p>
<pre><code>wa
&gt; q
  ```
</code></pre>
````

:::
