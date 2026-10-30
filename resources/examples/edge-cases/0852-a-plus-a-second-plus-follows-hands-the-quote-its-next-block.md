---
page: edge-lists
---

## A plus a second plus follows hands the quote its next block

PART 9 §17 L3, CARVE-P9-067 and carve#4438. Successive markers read the same in every host: after a quote, as after an item, the last `+` attaches the block and the earlier ones add nothing. Without a block below, that last `+` is refused and is a letter.

:::: compare

````carve
> q
+
+
tail
````

```html
<blockquote>
  <p>q</p>
  <p>tail</p>
</blockquote>
```

::::

:::: compare

````carve
> > q
> +
> +
> tail
````

```html
<blockquote>
  <blockquote>
    <p>q</p>
    <p>tail</p>
  </blockquote>
</blockquote>
```

::::

:::: compare

````carve
> q
+
+
````

```html
<blockquote>
  <p>q</p>
  <p>+</p>
</blockquote>
```

::::
