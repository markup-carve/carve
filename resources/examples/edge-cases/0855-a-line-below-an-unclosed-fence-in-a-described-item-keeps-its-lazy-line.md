---
page: edge-lists
---

## A line below an unclosed fence in a described item keeps its lazy line

A line in the description below the item's column ends the fence, and the column-0 line then folds into its paragraph, at every depth (carve#4162).

::: compare

```carve
:: t
: - ~~~
  x
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    <p>x
tail</p>
  </dd>
</dl>
```

:::

::: compare

```carve
:: t
: - - ~~~
  x
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </li>
    </ul>
    <p>x
tail</p>
  </dd>
</dl>
```

:::

::: compare

```carve
- :: t
  : - ~~~
    x
tail
```

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
        <p>x
tail</p>
      </dd>
    </dl>
  </li>
</ul>
```

:::

Without a line in the description the column-0 line stays outside: the fence is no paragraph.

::: compare

```carve
:: t
: - ~~~
tail
```

```html
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
<p>tail</p>
```

:::
