## Emphasis opener slash-adjacency

A `/` immediately before a bare delimiter suppresses an italic `/` or underline
`_` opener there: `/` never opens after `/` (same-delimiter adjacency) and `_`
never opens after `/` (the extra cross-delimiter guard, path protection). So the
underscore in `a_/_a_` stays literal.

::: compare

```carve
a_/_a_
```

```html
<p>a_/_a_</p>
```

:::

An underline opener directly after a slash is literal on its own, too.

::: compare

```carve
a/_y_
```

```html
<p>a/_y_</p>
```

:::

A path-like `/a/` opens italic; the following `_b_` does not open, because its
opening `_` sits immediately after the closing `/`.

::: compare

```carve
/a/_b_
```

```html
<p><em>a</em>_b_</p>
```

:::

The guard is specific to `/` and `_`: the other delimiters `*`, `~`, `=` DO open
after a `/`, so a preceding slash does not suppress them.

::: compare

```carve
a/~y~ a/=y=
```

```html
<p>a/<s>y</s> a/<mark>y</mark></p>
```

:::
