## A first-block item takes the next owned block

A line at the content column refuses `- +` and folds into the `+` (carve#4409). The
next root block begins after the item.

::: compare

```carve
- +
  x
>
```

```html
<ul>
  <li>+
x</li>
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
  <li>+
x</li>
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
  <li>+
x</li>
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
  <li>+
x</li>
</ul>
<blockquote>

</blockquote>
```

:::
