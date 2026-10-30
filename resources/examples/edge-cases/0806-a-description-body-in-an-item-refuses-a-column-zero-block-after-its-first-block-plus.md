---
page: edge-lists
---

## A description body in an item refuses a column-zero block after its first-block plus

Reversed by carve#4409: a description body's `+` takes a follower only at its marker column (PART 9 §17 L3, CARVE-P9-067). Under an indented `: +` in an item, a block at document column 0 refuses it at any depth: the `+` stays the description's text and the block stands after the list.

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
      <dd>+</dd>
    </dl>
  </li>
</ul>
<pre><code>x
</code></pre>
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
          <dd>+</dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
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
      <dd>+</dd>
    </dl>
  </li>
</ol>
<blockquote><p>q</p></blockquote>
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
      <dd>+</dd>
    </dl>
  </li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
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
      <dd>+</dd>
    </dl>
  </li>
</ul>
<pre><code>x

see
</code></pre>
```

:::
