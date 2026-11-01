---
page: edge-definitions
---

## A column-0 line after an unclosed fence in a description in an item leaves the list

A frame without its closer ends at its host boundary (`14:449`, carve#4735). Nothing is open to take the line lazily, at any item depth and behind any marker on the `dd` marker line.

::: compare

````carve
- :: t
  : ```
    a
z
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>
        <pre><code>a
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

````carve
- :: t
  : - ```
z
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </dd>
    </dl>
  </li>
</ul>
<p>z</p>
```

:::

::: compare

````carve
- - :: t
    : ```
      a
z
````

```html
<ul>
  <li>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
          <dd>
            <pre><code>a
</code></pre>
          </dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
<p>z</p>
```

:::
