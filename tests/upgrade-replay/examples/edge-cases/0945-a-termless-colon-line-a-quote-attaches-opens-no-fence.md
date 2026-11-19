---
page: edge-lists
---

## A termless colon line a quote attaches opens no fence

A quote's `+` attaches the next block, and that block's grant ends at its boundary (PART 9 §17 L3, carve#5040). A `: ` line with no term above it is a paragraph, not a description, so a backtick run on it opens a code span, not a fence. That span ends with the block, and the next quote line starts a paragraph.

::: compare

````carve
> +
: ``` js
> q
````

```html
<blockquote>
  <p>: <code> js</code></p>
  <p>q</p>
</blockquote>
```

:::

The run may stand alone,

::: compare

````carve
> +
: ```
> q
````

```html
<blockquote>
  <p>: <code></code></p>
  <p>q</p>
</blockquote>
```

:::

and a run on the next quote line opens a span of its own.

::: compare

`````carve
> +
: ````
> q```
`````

```html
<blockquote>
  <p>: <code></code></p>
  <p>q<code></code></p>
</blockquote>
```

:::
