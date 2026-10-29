## Line endings and a byte order mark

A line ends at `\n`, `\r\n` or a lone `\r`, and a byte order mark at the start
of a document is not content. All four spellings below are the same document
and produce the same output, including the same heading id - a carriage return
that leaked into the text would show up there rather than only in whitespace
nobody looks at.

The examples are written with ordinary newlines. The bytes are applied when the
fixture is generated (`::: compare crlf`, `cr`, `bom`), because the example
files are reviewable Markdown and are not protected from line-ending
normalization the way `tests/corpus/**` is.

::: compare crlf

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare cr

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare bom

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::
