---
page: edge-inline
---

## An extension's content closes at the first unescaped bracket

An escaped `]` is content.

::: compare

```carve
:foo[a\]b]
```

```html
<p><span class="ext-foo">a]b</span></p>
```

:::

An escaped backslash leaves the bracket unescaped, so it closes.

::: compare

```carve
:foo[a\\]b]
```

```html
<p><span class="ext-foo">a\</span>b]</p>
```

:::

With no unescaped `]` there is no extension.

::: compare

```carve
:foo[a\]
```

```html
<p>:foo[a]</p>
```

:::
