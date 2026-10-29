## The combined bold-italic token does not open after an underscore or a slash

The outer `/` of `/*...*/` takes all of `bare_opener('/')`, so a `_` or a `/`
directly before it keeps it from opening, as it does for a plain `/`. The inner
`*` pair is then an ordinary bold span:

::: compare

```carve
a_/*y*/ x
```

```html
<p>a_/<strong>y</strong>/ x</p>
```

:::

::: compare

```carve
//*y*/ x
```

```html
<p>//<strong>y</strong>/ x</p>
```

:::

::: compare

```carve
see snake_/*glob*/ now
```

```html
<p>see snake_/<strong>glob</strong>/ now</p>
```

:::

A `_` that opens a span that closes is markup, not the character before the
token (PART 9 §9), so the token still forms inside an underline:

::: compare

```carve
_/*x*/_
```

```html
<p><u><strong><em>x</em></strong></u></p>
```

:::
