---
page: edge-lists
---

## A plus at a quoted fence's content column stays payload

PART 9 §17 L3 keeps a `+` at an open fence's content column as payload. The attached quote's marker column does not claim that line.

::: compare

````carve
> +
>  ```
>  +
````

```html
<blockquote>
  <blockquote>
    <pre><code>+
</code></pre>
  </blockquote>
</blockquote>
```

:::
