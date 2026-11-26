---
page: edge-lists
---

## A stacked host reads its shifted closer past a payload line

A host reads a closer at its column whatever stands between the blank and the closer, under a stacked host as under a column-0 one (PART 0 S1, PART 9 §17 L3, carve#5587).

::: compare

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
        <pre><code>
x
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- 1. +
  ```

  tail
    ```
````

```html
<ul>
  <li>
    <ol>
      <li>
        <pre><code>
tail
</code></pre>
      </li>
    </ol>
  </li>
</ul>
```

:::

::: compare

````carve
> - 1. +
>   ```
>
>   tail
>     ```
````

```html
<blockquote>
  <ul>
    <li>
      <ol>
        <li>
          <pre><code>
tail
</code></pre>
        </li>
      </ol>
    </li>
  </ul>
</blockquote>
```

:::

::: compare

````carve
1. +
```

 ```
  # h
````

```html
<ol>
  <li>
    <pre><code>
</code></pre>
  </li>
</ol>
<section id="h">
  <h1>h</h1>
</section>
```

:::
