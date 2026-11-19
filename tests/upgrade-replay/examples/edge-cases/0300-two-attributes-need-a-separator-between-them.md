## Two attributes need a separator between them

`attribute_list` is `attribute, {space+, attribute}` (PART 7), so two attributes
may not touch. `{.a.b}` is not two classes, it is one malformed class name, and
one invalid item makes the whole block literal (§14).

::: compare

```carve
[x]{.a.b}
```

```html
<p>[x]{.a.b}</p>
```

:::

The same holds when the two kinds differ, which is the shape a strip-based
validator gets wrong: it removes `.a`, leaves a separator behind where the
source had none, and then accepts `#i` as though it had been separated.

::: compare

```carve
[x]{.a#i}
```

```html
<p>[x]{.a#i}</p>
```

:::

An id abutting a class is literal for the same reason, and the `#i.c` left
inside the braces is then ordinary content - where a `#` opens a tag.

::: compare

```carve
[x]{#i.c}
```

```html
<p>[x]{<span class="tag"><strong>#i.c</strong></span>}</p>
```

:::

A colon inside an UNQUOTED VALUE is not a separator question: the value runs to
the next whitespace, so it is one attribute and the block is valid.

::: compare

```carve
[x]{k=a:b}
```

```html
<p><span k="a:b">x</span></p>
```

:::
