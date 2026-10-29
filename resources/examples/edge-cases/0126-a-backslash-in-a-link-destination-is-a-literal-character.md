## A backslash in a link destination is a literal character

A link destination has no backslash escapes: `url_char` includes the backslash
as an ordinary URL character, kept verbatim. `[t](a\b)` links to `a\b`.

::: compare

```carve
[t](a\b)
```

```html
<p><a href="a\b">t</a></p>
```

:::
