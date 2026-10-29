## Empty link and image titles are preserved

An explicit empty title (`""`) is kept as `title=""` rather than dropped -- the
grammar permits an empty `link_title`, and all three implementations emit it
identically.

::: compare

```carve
[x](u "")
```

```html
<p><a href="u" title="">x</a></p>
```

:::
