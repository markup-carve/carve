## An unclosed backtick run still forms math

Math uses the code span rule, which permits an unclosed backtick run. The empty body is still math.

::: compare

```carve
$`
```

```html
<p><span class="math inline" role="math">\(\)</span></p>
```

:::

::: compare

```carve
$$``
```

```html
<p><span class="math display" role="math">\[\]</span></p>
```

:::
