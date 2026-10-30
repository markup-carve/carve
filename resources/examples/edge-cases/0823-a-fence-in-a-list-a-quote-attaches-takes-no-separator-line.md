---
page: edge-lists
---

## A fence in a list a quote attaches takes no separator line

A quote's `+` separates the block it attaches from what follows, but a fence the block leaves open keeps its lines as written (PART 9 §17 L4). The fence may stand behind a list marker,

::::::: compare

````carve
> t
+
- ```
````

````html
<blockquote>
  <p>t</p>
  <ul>
    <li>
      <pre><code></code></pre>
    </li>
  </ul>
</blockquote>
````

:::::::

the next quote line then leaves the item and the fence is still empty,

::::::: compare

````carve
> t
+
- ```
> b
````

````html
<blockquote>
  <p>t</p>
  <ul>
    <li>
      <pre><code></code></pre>
    </li>
  </ul>
  <p>b</p>
</blockquote>
````

:::::::

it may open on a later line of the list,

::::::: compare

````carve
> t
+
- x
  ```
> b
````

````html
<blockquote>
  <p>t</p>
  <ul>
    <li>x
      <pre><code></code></pre>
    </li>
  </ul>
  <p>b</p>
</blockquote>
````

:::::::

or stand behind a description marker.

::::::: compare

````carve
> t
+
:: t
: ```
````

````html
<blockquote>
  <p>t</p>
  <dl>
    <dt>t</dt>
    <dd>
      <pre><code></code></pre>
    </dd>
  </dl>
</blockquote>
````

:::::::

A closed fence is not affected.

::::::: compare

````carve
> t
+
- ```
  c
  ```
> b
````

````html
<blockquote>
  <p>t</p>
  <ul>
    <li>
      <pre><code>c
</code></pre>
    </li>
  </ul>
  <p>b</p>
</blockquote>
````

:::::::
