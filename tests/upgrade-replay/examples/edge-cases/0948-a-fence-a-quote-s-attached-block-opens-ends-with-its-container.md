---
page: edge-lists
---

## A fence a quote's attached block opens ends with its container

A quote's `+` attaches the next block, and that block's grant ends at its boundary (PART 9 §17 L3, carve#5045). A fence the block leaves open ends there too, so the quote's next line starts a paragraph and no empty payload line is added. A description's body may open a list, and the fence behind its marker is found the same way,

::: compare

````carve
> :: t
+
: - ``` js
> q
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <ul>
        <li>
          <pre><code class="language-js"></code></pre>
        </li>
      </ul>
    </dd>
  </dl>
  <p>q</p>
</blockquote>
```

:::

and a line left of the fence's column leaves its item, which ends the fence before the block does.

::: compare

````carve
> :: t
+
: - ``` js
  - x
> q
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <ul>
        <li>
          <pre><code class="language-js"></code></pre>
        </li>
        <li>x</li>
      </ul>
    </dd>
  </dl>
  <p>q</p>
</blockquote>
```

:::

The same holds for a sibling item after a first-block `+`

::: compare

````carve
> +
- ``` js
- x
> q
````

```html
<blockquote>
  <ul>
    <li>
      <pre><code class="language-js"></code></pre>
    </li>
    <li>x</li>
  </ul>
  <p>q</p>
</blockquote>
```

:::

and after a separate-line `+`.

::: compare

````carve
> a
+
- ``` js
- x
> q
````

```html
<blockquote>
  <p>a</p>
  <ul>
    <li>
      <pre><code class="language-js"></code></pre>
    </li>
    <li>x</li>
  </ul>
  <p>q</p>
</blockquote>
```

:::
