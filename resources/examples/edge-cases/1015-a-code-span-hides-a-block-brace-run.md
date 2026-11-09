---
page: edge-lists
---

## A code span hides a block brace run

An open inline code span holds the brace lines as text before block-position runs are read (CARVE-P2-035, carve#5618). The later fence opens normally.

::: compare
````carve
p
 `open
 {.x
 .y}
 ```
 z
````

```html
<p>p
<code>open
{.x
.y}</code></p>
<pre><code>z
</code></pre>
```
:::

A complete attribute line is hidden by the same open span.

::: compare
````carve
p
`open
{.x}
`
````

```html
<p>p
<code>open
{.x}
</code></p>
```
:::
