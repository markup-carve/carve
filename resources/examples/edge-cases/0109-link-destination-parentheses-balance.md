## Link destination parentheses balance

A `(` inside a `(...)` destination is matched against a later `)`, so the
destination ends at the first `)` that has **no opener left to pair with**.
URLs carrying parentheses -- Wikipedia and MDN produce them constantly -- are
therefore written plainly, with no escape and no second spelling. Djot and
CommonMark both balance destination parentheses the same way.

::: compare

```carve
[x](http://a/b(c))
```

```html
<p><a href="http://a/b(c)">x</a></p>
```

:::

Nesting is tracked to any depth, and a `)` with nothing to close ends the
destination -- the rest stays literal text.

::: compare

```carve
[x](a(b(c))d) and [y](e)f)
```

```html
<p><a href="a(b(c))d">x</a> and <a href="e">y</a>f)</p>
```

:::

An unbalanced parenthesis that belongs *inside* the URL is backslash-escaped.
Only `\(`, `\)` and `\\` are escapes here, so a backslash in front of anything
else is an ordinary character and URLs full of backslashes are unaffected.

::: compare

```carve
[x](http://a/b\)c) and [y](a\\b) and [z](a\qb)
```

```html
<p><a href="http://a/b)c">x</a> and <a href="a\b">y</a> and <a href="a\qb">z</a></p>
```

:::

A newline counts as whitespace, so it ends the destination too: an unclosed `(`
whose run reaches the end of the line is not a link. The `(` and the following
text stay literal across the line break (grammar `link_destination`).

::: compare

```carve
[t](url
more)
```

```html
<p>[t](url
more)</p>
```

:::
