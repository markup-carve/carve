## Strong emphasis starting with a link

A `*[` at an emphasis-opening position is a bold span whose content begins with a link - only a line-start `*[` followed by `term]:` is an abbreviation definition.

::: compare

```carve
See *[the docs](url) for more* info.
```

```html
<p>See <strong><a href="url">the docs</a> for more</strong> info.</p>
```

:::
