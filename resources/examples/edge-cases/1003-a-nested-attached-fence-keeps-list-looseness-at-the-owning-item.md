---
page: edge-lists
---

## A nested attached fence keeps list looseness at the owning item

A blank between child lists loosens the parent item. A blank inside a child item stays with that child under PART 9 §17 L1 (carve#5534).

::: compare

````carve
- a
  - +
    ```
  * z

  - q
````

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    <ul>
      <li>z</li>
    </ul>
    <ul>
      <li>q</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- a
  - +
  ```
  - z

    q
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code>- z
</code></pre>
        <p>q</p>
      </li>
    </ul>
  </li>
</ul>
```

:::
