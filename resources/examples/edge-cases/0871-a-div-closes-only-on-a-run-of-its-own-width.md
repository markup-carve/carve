---
page: edge-definitions
---

## A div closes only on a run of its own width

A paragraph in an open div that holds an invalid opener absorbs a bare run of another width as text. Only a run of the div's own width closes the div, in any container (CARVE-P9-016, carve#4550).

::::: compare

```carve
:::
:::e
::::
q
:::
after
```

```html
<div>
  <p>:::e
::::
q</p>
</div>
<p>after</p>
```

:::::

::::: compare

```carve
- :::
  :::e
  ::::
  :::
l
```

```html
<ul>
  <li>
    <div>
      <p>:::e
::::</p>
    </div>
  </li>
</ul>
<p>l</p>
```

:::::

::::: compare

```carve
> :::
> :::e
> ::::
> q
> :::

after
```

```html
<blockquote>
  <div>
    <p>:::e
::::
q</p>
  </div>
</blockquote>
<p>after</p>
```

:::::
