## An empty inline note is literal

PART 9 §16 says it in as many words: "Empty or whitespace-only (`^[]`, `^[ ]`)
is literal; an unclosed `^[…` is literal." So `^[` does not open a note there.

What is left is ordinary text plus an ordinary bracketed run, and that matters
for the third case below: a bare `[]` is literal, but `[]{.c}` carries an
attribute tail and is a span (PART 9 §14), so the `^` is the only part of
`^[]{.c}` that stays as written.

This needed pinning because the executable spec refused all three, and no corpus
document held an empty note - so the refusal was unreachable, `npm run
core:check` reported every input conformant either way, and the gap was guarded
by the absence of a fixture rather than by a decision (markup-carve/carve#1188,
the markup-carve/carve#755 class).

::: compare

```carve
x ^[]
```

```html
<p>x ^[]</p>
```

:::

Whitespace-only is the same case: a space between the brackets is not content.

::: compare

```carve
x ^[ ]
```

```html
<p>x ^[ ]</p>
```

:::

With an attribute block the brackets are a span, and only the `^` is literal.

::: compare

```carve
x ^[]{.c}
```

```html
<p>x ^<span class="c"></span></p>
```

:::
