## Invalid include line ranges remain literal in core

::: compare

```carve
{{ data/p2.csv @code:csv @lines:0-2 }}
```

```html
<p>{{ data/p2.csv @code:csv @lines:0-2 }}</p>
```

:::

::: compare

```carve
{{ data/p2.csv @code:csv @lines:2-1 }}
```

```html
<p>{{ data/p2.csv @code:csv @lines:2-1 }}</p>
```

:::

::: compare

```carve
{{ data/p2.csv @code:csv @lines:01-2 }}
```

```html
<p>{{ data/p2.csv @code:csv @lines:01-2 }}</p>
```

:::
