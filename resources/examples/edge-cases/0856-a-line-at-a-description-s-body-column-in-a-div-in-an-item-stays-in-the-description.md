---
page: edge-lists
---

## A line at a description's body column in a div in an item stays in the description

CARVE-P9-083 and carve#4497: the item does not rebase it, so the div reads as it does at top level, and a fence in the body leaves the closer to the div.

::: compare

````carve
- :::
  :: t
  : a
    > q
  :::
````

```html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>
          <p>a</p>
          <blockquote><p>q</p></blockquote>
        </dd>
      </dl>
    </div>
  </li>
</ul>
```

:::

::: compare

````carve
- :::
  :: t
  : a

    ~~~
    x
  :::
````

```html
<ul>
  <li>
    <div>
      <dl>
        <dt>t</dt>
        <dd>
          <p>a</p>
          <pre><code>x
</code></pre>
        </dd>
      </dl>
    </div>
  </li>
</ul>
```

:::
