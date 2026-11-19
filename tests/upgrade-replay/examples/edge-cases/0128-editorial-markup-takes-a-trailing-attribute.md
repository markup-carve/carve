## Editorial markup takes a trailing attribute

An addition `{+...+}` or deletion `{-...-}` is an ordinary inline node, so a
trailing `{...}` attribute block attaches to its `<ins>` / `<del>`, exactly like
a span, code span, link, or emphasis (PART 9 §22 / §15). The markers are
single-character: the doubled form `{++a++}` is not special — the outer `+` are
the delimiters and `+a+` is literal content, so it yields `<ins>+a+</ins>` (as
the example below shows).

::: compare

```carve
{++a++}{.a}
```

```html
<p><ins class="a">+a+</ins></p>
```

:::
