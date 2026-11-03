---
page: edge-lists
---

## A quote's next + is not payload of an item fence the last block left open

A `+` is a marker, consumed when it attaches (PART 9 §17 L3). When the block the quote's previous `+` attached ends in an item's open code fence, the next `+` at column 0 misses the fence's owner, which ends the fence before it (PART 0 S1), so it adds no payload line. The item fence ends where a flush-left fence in the same place ends (carve#5046). The last case is an item fence with no payload line, which stays empty.

::: compare

````carve
> a
+
- ``` js
  x
+
- y
````

```html
<blockquote>
  <p>a</p>
  <ul>
    <li>
      <pre><code class="language-js">x
</code></pre>
    </li>
    <li><p>y</p></li>
  </ul>
</blockquote>
```

:::

::: compare

````carve
> a
+
1. ```
   x
+
y
````

```html
<blockquote>
  <p>a</p>
  <ol>
    <li>
      <pre><code>x
</code></pre>
    </li>
  </ol>
  <p>y</p>
</blockquote>
```

:::

::: compare

````carve
> a
+
- b
  - ~~~
    x
+
- y
````

```html
<blockquote>
  <p>a</p>
  <ul>
    <li><p>b</p>
      <ul>
        <li>
          <pre><code>x
</code></pre>
        </li>
      </ul>
    </li>
    <li><p>y</p></li>
  </ul>
</blockquote>
```

:::

::: compare

````carve
> a
+
- ``` js
+
- y
````

```html
<blockquote>
  <p>a</p>
  <ul>
    <li>
      <pre><code class="language-js"></code></pre>
    </li>
    <li><p>y</p></li>
  </ul>
</blockquote>
```

:::
