---
page: edge-definitions
---

## A div closes only on a run of its own width

Only a run of an open div's own width closes it, in any container. A run of another width opens a nested div, even under a paragraph that holds an invalid opener (carve#4550, carve#4863).

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
  <p>:::e</p>
  <div>
    <p>q</p>
    <div>
      <p>after</p>
    </div>
  </div>
</div>
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
      <p>:::e</p>
      <div>
        <div>

        </div>
      </div>
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
    <p>:::e</p>
    <div>
      <p>q</p>
      <div>

      </div>
    </div>
  </div>
</blockquote>
<p>after</p>
```

:::::
