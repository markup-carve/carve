## A hyphen run at the start of a span is a flag

The start of an inline span's content is the start of the inline content
(CARVE-P3-023), so a hyphen run there followed by a non-whitespace character
stays literal under CARVE-P3-021, whatever the span's opener is
(markup-carve/carve#4170).

::: compare

```carve
a *--x* b, a /--x/ b, a _---x_ b and a */--x/* b
```

```html
<p>a <strong>--x</strong> b, a <em>--x</em> b, a <u>---x</u> b and a <strong><em>--x</em></strong> b</p>
```

:::

A braced span's content starts after its `{X` opener.

::: compare

```carve
a {*--x*} b and a {=---x=} b
```

```html
<p>a <strong>--x</strong> b and a <mark>---x</mark> b</p>
```

:::

A run followed by a space, a run inside a word, and a run after a `*` that
opens nothing still convert.

::: compare

```carve
a *-- x* b, a *x--y* b and 2*--x
```

```html
<p>a <strong>– x</strong> b, a <strong>x–y</strong> b and 2*–x</p>
```

:::
