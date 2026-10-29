## Doubled emphasis delimiters

A bare single-character emphasis delimiter immediately adjacent to the same
delimiter does not open a span, so a doubled delimiter is literal text. This
"no nesting of same type" rule is uniform across all seven single-character
delimiters: `**`, `~~`, `^^`, `==`, and `,,` stay literal exactly like `//` and
`__`.

::: compare

```carve
**a** ~~b~~ ^^c^^
```

```html
<p>**a** ~~b~~ ^^c^^</p>
```

:::
