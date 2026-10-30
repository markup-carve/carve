---
page: edge-lists
---

## A fence a nested first-block plus pulls to column zero keeps its payload

A code fence a first-block `+` takes at column zero starts left of every enclosing item, so no item's content column is stripped from its payload. The depth of the `+` and a quote on the marker line change nothing (carve#4389).

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
      <li>
        <pre><code>  x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
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
      <li>
        <pre><code>  x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
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
    <blockquote>
      <pre><code>  x
</code></pre>
    </blockquote>
  </li>
</ul>
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
          <li>
            <pre><code>      x
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::::
