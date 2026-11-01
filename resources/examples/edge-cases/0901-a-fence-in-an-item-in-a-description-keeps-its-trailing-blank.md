---
page: edge-definitions
---

## A fence in an item in a description keeps its trailing blank

A fence keeps the blank line at the end of its content wherever it ends (carve#4033, carve#4741). An item in a `dd` is no exception, at the top level or inside an outer item.

::: compare

````carve
:: t
: . ```
     ```

````

````html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>
        <pre><code> ```

</code></pre>
      </li>
    </ol>
  </dd>
</dl>
````

:::

::: compare

````carve
:: t
: - ```
    x

````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code>x

</code></pre>
      </li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

````carve
- :: t
  : - ```
      x

````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>
        <ul>
          <li>
            <pre><code>x

</code></pre>
          </li>
        </ul>
      </dd>
    </dl>
  </li>
</ul>
```

:::
