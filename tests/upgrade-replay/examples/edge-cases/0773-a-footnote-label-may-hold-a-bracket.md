## A footnote label may hold a bracket

A footnote label is any run of characters other than `]` and a line break, and a `[^` run is a footnote reference before bracket scanning. So `[^[g]` is a reference whether or not it resolves, it starts no bracket run, and a delimiter after its `]` can close a span opened before it.

::: compare

```carve
/[^[g]/] b/
```

```html
<p><em>[^[g]</em>] b/</p>
```

:::

::: compare

```carve
*[^[g]*] b*
```

```html
<p><strong>[^[g]</strong>] b*</p>
```

:::
