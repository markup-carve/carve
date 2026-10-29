## URL sinks reject schemes after emitted-value normalization

::: compare

```carve
[x](‮javascript:alert(1))
```

```html
<p><a href="‮javascript:alert(1)">x</a></p>
```

:::

::: compare

```carve
[x](javascript:alert(1))
```

```html
<p><a href="">x</a></p>
```

:::
