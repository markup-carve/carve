---
page: edge-lists
---

## An accepted plus needs a follower that reaches its host

PART 9 §17 L3, CARVE-P9-067 and CARVE-P9-085 (carve#4396). A line of nothing but quote markers holds no block, and a `>` left of a container holding a quote is not that quote's prefix. Both refuse the `+`, which then reads like a letter. A `+` that ends a sub-parse no longer crashes the description reader.

:::: compare

````carve
> a
>
+
>
````

```html
<blockquote><p>a</p></blockquote>
<p>+</p>
<blockquote>

</blockquote>
```

::::

:::: compare

````carve
> +
>
````

```html
<blockquote><p>+</p></blockquote>
```

::::

:::: compare

````carve
:: t
: > 1. +
>   x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <ol>
        <li>+</li>
      </ol>
    </blockquote>
  </dd>
</dl>
<blockquote><p>x</p></blockquote>
```

::::

:::: compare

````carve
- > :: t
  > : ```
  >   code
  >   ```
> +
:: u
: v
````

```html
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>t</dt>
        <dd>
          <pre><code>code
</code></pre>
        </dd>
      </dl>
    </blockquote>
  </li>
</ul>
<blockquote>
  <dl>
    <dt>u</dt>
    <dd>v</dd>
  </dl>
</blockquote>
```

::::
