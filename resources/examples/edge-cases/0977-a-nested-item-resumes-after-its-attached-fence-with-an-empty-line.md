---
page: edge-lists
---

## A nested item resumes after its attached fence with an empty line

A fence a marker-line `+` takes runs through its closer, empty lines included (PART 9 §17 L3). After it the nested item resumes at its content column (CARVE-P0-024).

::: compare

````carve
- a
  - +
  ```
  x

  y
  ```

    # g
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code>x

y
</code></pre>
        <h1 id="g">g</h1>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - +
  ::: w
  x

  y
  :::

    # g
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <div class="w">
          <p>x</p>
          <p>y</p>
        </div>
        <h1 id="g">g</h1>
      </li>
    </ul>
  </li>
</ul>
```

:::
