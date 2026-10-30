---
page: edge-lists
---

## A comment or link definition at a body's column spends its first-block plus

A first-block `+` takes one block (CARVE-P9-067). A line comment or a link definition at the marker body's content column is that block even though it renders nothing, so a column-zero line after it is not the body's and starts its own block (carve#4307). A comment or link definition at column zero is not at the body's column, so it is not the body's block and the `+` still takes the next one.

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
      <li></li>
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
  <li></li>
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
      <li></li>
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
  <li></li>
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
      <li>after</li>
    </ul>
  </li>
</ul>
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
      <li>after</li>
    </ul>
  </li>
</ul>
```

:::::
