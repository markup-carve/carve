---
page: edge-lists
---

## A verse lead under an indented opener is measured per frame

A line-block opener's own indentation is no frame. A tabbed verse line keeps the columns its containers leave it, less the opener's column in the same frame, so a tab spelling and its per-frame space spelling keep the same lead (PART 9 §23, §24 C5, carve#5755, carve#5885).

::: compare

```carve
- a
   ::: |
  	x
   :::
```

```html
<ul>
  <li>a
    <div class="line-block">
      <p>&nbsp;&nbsp;&nbsp;x</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
- a
   ::: |
    	x
   :::
```

```html
<ul>
  <li>a
    <div class="line-block">
      <p>&nbsp;&nbsp;&nbsp;x</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  	::: |
    	x
  	:::
```

```html
<ul>
  <li>a
    <div class="line-block">
      <p>x</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
> - a
>    ::: |
>   	x
>    :::
```

```html
<blockquote>
  <ul>
    <li>a
      <div class="line-block">
        <p>&nbsp;&nbsp;&nbsp;x</p>
      </div>
    </li>
  </ul>
</blockquote>
```

:::
