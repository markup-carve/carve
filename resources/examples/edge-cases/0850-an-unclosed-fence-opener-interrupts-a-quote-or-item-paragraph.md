---
page: edge-lists
---

## An unclosed fence opener interrupts a quote or item paragraph

PART 9 §10 I4 searches for no closer, in a lazy position or in an item: the opener ends the paragraph and the fence runs to the end of its container (carve#4018, carve#4036).

:::: compare

````carve
> a
```
b
````

```html
<blockquote><p>a</p></blockquote>
<pre><code>b
</code></pre>
```

::::

:::: compare

````carve
- d
   ```

  l
````

```html
<ul>
  <li>d
    <pre><code>
l
</code></pre>
  </li>
</ul>
```

::::

