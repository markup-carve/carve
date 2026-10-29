## Trailing attribute block edge cases

A trailing attribute block applies to an emphasis span, like any other inline
node.

::: compare

```carve
*x*{.real}
```

```html
<p><strong class="real">x</strong></p>
```

:::

A line-leading image is a standalone block image only when a trailing `{…}`
yields real attributes. An empty/whitespace or invalid block falls through to
a paragraph and stays literal.

::: compare

```carve
![a](/i){???}
```

```html
<p><img src="/i" alt="a">{???}</p>
```

:::

::: compare

```carve
![a](/i){ }
```

```html
<p><img src="/i" alt="a">{ }</p>
```

:::
