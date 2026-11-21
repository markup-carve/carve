## Invalid line-range includes within paragraphs stay literal

::: compare

```carve
before {{ data/p2.csv @code:csv @lines:01-2 }} after
```

```html
<p>before {{ data/p2.csv @code:csv @lines:01-2 }} after</p>
```

:::

::: compare

```carve
before {{ data/p2.csv @lines:0-2 }} after
```

```html
<p>before {{ data/p2.csv @lines:0-2 }} after</p>
```

:::

::: compare

```carve
*before {{ data/p2.csv @lines:2-1 }} after*
```

```html
<p><strong>before {{ data/p2.csv @lines:2-1 }} after</strong></p>
```

:::
