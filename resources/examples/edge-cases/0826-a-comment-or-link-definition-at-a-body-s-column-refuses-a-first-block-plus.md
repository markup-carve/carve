---
page: edge-lists
---

## A comment or link definition at a body's column refuses a first-block plus

A first-block `+` tests its next visible line at the marker column (CARVE-P9-067, carve#4409). A `%%` line or one-line link definition is erased before that test (PART 0 S1, carve#5012). The follower attaches when it reaches the marker column; otherwise the refused `+` disappears (carve#5013). A definition still registers document-wide.

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
  <li>after</li>
</ul>
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
  <li>
    <pre><code>z
</code></pre>
  </li>
</ul>
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
