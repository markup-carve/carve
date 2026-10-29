## A first-block item takes the next owned block

The content-column paragraph is the one block attached by `- +`. The next
root block begins after the item.

::: compare

```carve
- +
  x
>
```

```html
<ul>
  <li>x</li>
</ul>
<blockquote>

</blockquote>
```

:::

::: compare

```carve
- +
  x
# h
```

```html
<ul>
  <li>x</li>
</ul>
<section id="h">
  <h1>h</h1>
</section>
```

:::

::: compare

```carve
- +
  x
---
```

```html
<ul>
  <li>x</li>
</ul>
<hr>
```

:::

::: compare

```carve
- +
	x
>
```

```html
<ul>
  <li>x</li>
</ul>
<blockquote>

</blockquote>
```

:::
