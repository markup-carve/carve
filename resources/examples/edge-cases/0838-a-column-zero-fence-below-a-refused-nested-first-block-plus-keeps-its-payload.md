---
page: edge-lists
---

## A column-zero fence below a refused nested first-block plus keeps its payload

A code fence at column zero refuses a nested first-block `+` (carve#4409) and stands at document level. It starts left of every enclosing item, so no item's content column is stripped from its payload. The depth of the `+` and a quote on the marker line change nothing (carve#4389).

::::: compare

````carve
- - +
```
  x
```
````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<pre><code>  x
</code></pre>
```

:::::

::::: compare

````carve
- a
  - +
```
  x
```
````

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<pre><code>  x
</code></pre>
```

:::::

::::: compare

````carve
- > +
```
  x
```
````

```html
<ul>
  <li>
    <blockquote><p>+</p></blockquote>
  </li>
</ul>
<pre><code>  x
</code></pre>
```

:::::

::::: compare

````carve
- - - +
```
      x
```
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>+</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<pre><code>      x
</code></pre>
```

:::::
