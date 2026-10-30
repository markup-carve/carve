---
page: edge-lists
---

## A comment or link definition at a body's column refuses a first-block plus

A first-block `+` takes a block only at its marker column (CARVE-P9-067, carve#4409). A line comment or a link definition at the body's content column or at column zero refuses it, and the `+` stays the item's text. The comment or definition renders nothing and ends that paragraph, so the line after it starts its own block (carve#4307).

::::: compare

```carve
- a
  * +
    %% c
after
```

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<p>after</p>
```

:::::

::::: compare

```carve
- +
  %% c
after
```

```html
<ul>
  <li>+</li>
</ul>
<p>after</p>
```

:::::

::::: compare

```carve
- a
  * +
    [r]: /u
after
```

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<p>after</p>
```

:::::

::::: compare

````carve
- +
  %% c
  %% d
```
z
```
````

```html
<ul>
  <li>+</li>
</ul>
<pre><code>z
</code></pre>
```

:::::

::::: compare

```carve
- a
  * +
[r]: /u
  after
```

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<p>after</p>
```

:::::

::::: compare

```carve
- a
  * +
%% c
  after
```

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<p>after</p>
```

:::::
