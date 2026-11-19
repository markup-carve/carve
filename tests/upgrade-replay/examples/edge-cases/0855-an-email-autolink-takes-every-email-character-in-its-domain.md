---
page: edge-inline
---

## An email autolink takes every email character in its domain

`email_autolink` allows any `email_char` before the final `.`, a dot included.

::: compare

```carve
<a@b..c>
```

```html
<p><a href="mailto:a@b..c">a@b..c</a></p>
```

:::

::: compare

```carve
<a@b+c.d>
```

```html
<p><a href="mailto:a@b+c.d">a@b+c.d</a></p>
```

:::

The domain needs a character after the `@` and letters after the last dot.

::: compare

```carve
<a@.c>
```

```html
<p>&lt;a@.c&gt;</p>
```

:::

::: compare

```carve
<a@b.c1>
```

```html
<p>&lt;a@b.c1&gt;</p>
```

:::
