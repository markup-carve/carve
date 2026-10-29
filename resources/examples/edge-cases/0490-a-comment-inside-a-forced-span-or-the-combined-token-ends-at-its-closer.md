## A comment inside a forced span or the combined token ends at its closer

CARVE-P9-042 names an explicit closer, not only a table cell's `|` or link
text's `]`, as a boundary a `%%` comment does not cross: a forced span
`{X...X}` at its `X}`, and the combined `/*...*/` token at its `*/`
(markup-carve/carve#2167). The comment still runs to a line break first where
one comes sooner.

::: compare

```carve
{*a %% b*} y
```

```html
<p><strong>a</strong> y</p>
```

:::

A different forced delimiter, the same bound.

::: compare

```carve
{_a %% b_} y
```

```html
<p><u>a</u> y</p>
```

:::

The combined token, on one line and across a soft break.

::: compare

```carve
/*a %% b*/ y
```

```html
<p><strong><em>a</em></strong> y</p>
```

:::

::: compare

```carve
/*a %%c
b*/ y
```

```html
<p><strong><em>a
b</em></strong> y</p>
```

:::
