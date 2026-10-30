## A nested item whose plus is refused releases the next root block

A line at the inner item's content column refuses the `+` and folds into it (carve#4409). The next block begins at the document root.

::: compare

```carve
- - +
    x
> tail
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
<blockquote><p>tail</p></blockquote>
```

:::

::: compare

```carve
- - +
    x
# tail
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
<section id="tail">
  <h1>tail</h1>
</section>
```

:::

::: compare

```carve
- - +
    x
---
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
<hr>
```

:::

:::: compare

```carve
- - +
    x
::: note
tail
:::
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
<aside class="admonition note" aria-label="Note">
  <p>tail</p>
</aside>
```

::::

::: compare

```carve
- - +
    x
:: tail
:  definition
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
<dl>
  <dt>tail</dt>
  <dd>definition</dd>
</dl>
```

:::
