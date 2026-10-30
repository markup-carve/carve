---
page: edge-definitions
---

## An open div's closer is not absorbed

A bare run of an open div's width closes the div even when the paragraph inside it holds an invalid opener, so nothing is left for a line below to fold into. A container reads this as the top level does (CARVE-P9-016, carve#4397).

:::: compare

```carve
- :::
  :::e
  :::
l
```

```html
<ul>
  <li>
    <div>
      <p>:::e</p>
    </div>
  </li>
</ul>
<p>l</p>
```

::::

:::: compare

```carve
> :::
> :::e
> :::
l
```

```html
<blockquote>
  <div>
    <p>:::e</p>
  </div>
</blockquote>
<p>l</p>
```

::::

:::: compare

```carve
- x
  :::e
  :::

  l
```

```html
<ul>
  <li><p>x
:::e
:::</p>
    <p>l</p>
  </li>
</ul>
```

::::

:::: compare

```carve
:: t
: :::
  :::e
  :::
  :::
l
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>
      <p>:::e</p>
    </div>
    <div>

    </div>
  </dd>
</dl>
<p>l</p>
```

::::
