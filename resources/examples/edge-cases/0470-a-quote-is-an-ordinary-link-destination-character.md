## A quote is an ordinary link destination character

A title opens only after the space that ends the destination, so a `"` inside
the destination is part of the `href`.

::: compare

```carve
[x](a"b)
```

```html
<p><a href="a&quot;b">x</a></p>
```

:::

::: compare

```carve
[x](a"b "t")
```

```html
<p><a href="a&quot;b" title="t">x</a></p>
```

:::

::: compare

```carve
[x](")
```

```html
<p><a href="&quot;">x</a></p>
```

:::

::: compare

```carve
[x]("t")
```

```html
<p><a href="&quot;t&quot;">x</a></p>
```

:::

::: compare

```carve
[x](a`b{c}d|e^f<g>h)
```

```html
<p><a href="a`b{c}d|e^f&lt;g&gt;h">x</a></p>
```

:::
