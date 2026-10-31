---
page: edge-inline
---

## A comment at the start of content counts as nothing for quotes

A braced comment that opens a paragraph renders nothing, so a quote after it is still at the start of the content and keeps its opening glyph (markup-carve/carve#4552).

::: compare

```carve
{%%}'word
```

```html
<p>‘word</p>
```

:::

::: compare

```carve
{%%}"q"
```

```html
<p>“q”</p>
```

:::

A comment with text, or two in a row, counts as nothing too.

::: compare

```carve
{% c %}{% d %}'word
```

```html
<p>‘word</p>
```

:::

After a word the comment changes nothing: the quote is not at the start.

::: compare

```carve
a {%%}'word
```

```html
<p>a ’word</p>
```

:::
