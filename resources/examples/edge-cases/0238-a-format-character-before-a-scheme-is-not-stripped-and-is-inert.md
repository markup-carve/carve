## A format character before a scheme is not stripped, and is inert

§25's scheme probe strips leading controls, every Unicode space and the BOM. It stops there: the WHATWG URL parser strips C0 controls and space and nothing else, so a destination starting with ZERO WIDTH SPACE fails to parse as a URL at all and resolves as a relative path. It stays in the document as the author wrote it.

::: compare

```carve
[x](​javascript:alert(1))
```

```html
<p><a href="​javascript:alert(1)">x</a></p>
```

:::
