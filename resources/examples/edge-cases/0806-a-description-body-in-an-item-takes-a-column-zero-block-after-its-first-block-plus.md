---
page: edge-lists
---

## A description body in an item takes a column-zero block after its first-block plus

A description body takes its next owned block the way a list item does (PART 9 §17 L4, CARVE-P9-067, carve#4166): under an indented `: +` in an item, a block at document column 0 is the description's, at any depth.

::: compare

````carve
- a
  :: t
  : +
```
x
```
````

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>
        <pre><code>x
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
```

:::

::: compare

````carve
- a
  - b
    :: t
    : +
```
x
```
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <dl>
          <dt>t</dt>
          <dd>
            <pre><code>x
</code></pre>
          </dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
1. a
   :: t
   : +
> q
```

```html
<ol>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>
        <blockquote><p>q</p></blockquote>
      </dd>
    </dl>
  </li>
</ol>
```

:::

::: compare

```carve
- a
  :: t
  : +
# H
```

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>
        <h1 id="H">H</h1>
      </dd>
    </dl>
  </li>
</ul>
```

:::

::: compare

````carve
- a
  :: t
  : +
```
x

see
````

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>
        <pre><code>x
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>see</p>
```

:::
