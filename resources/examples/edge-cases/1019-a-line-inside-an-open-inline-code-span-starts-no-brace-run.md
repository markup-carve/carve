---
page: edge-lists
---

## A line inside an open inline code span starts no brace run

A brace line inside a still-open inline code span of its paragraph is span text, not a block-position run, whatever its column, so the fence after it opens (CARVE-P2-035, carve#5618).

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

::: compare

````carve
> p
>  `open
>  {%
>  c %}
>  ```
>  z
````

```html
<blockquote>
  <p>p
<code>open
{%
c %}</code></p>
  <pre><code>z
</code></pre>
</blockquote>
```

:::
