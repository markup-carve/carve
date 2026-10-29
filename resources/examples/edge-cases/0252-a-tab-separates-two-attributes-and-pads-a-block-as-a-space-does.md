## A tab separates two attributes, and pads a block, as a space does

**The heading is the name this category was given when it pinned the opposite
answer, and it is kept deliberately.** Corpus category names are an append-only
contract - every engine allowlists them as `NN-slug`, so renaming one
invalidates all of those lists at once. The documents below now pin the
NARROWED answer (markup-carve/carve#906): a tab does not separate two attributes
inside an INLINE block. The second half of the heading no longer holds either:
a tab inside a block-attribute LINE is content too, and only the indentation of
a continuation line takes one. The category *The inline attribute interior is
space-only, the attribute line is not* pins both.

Every whitespace slot of the inline block takes `space`. All of them sit AFTER
the first non-whitespace character of their line, which is where PART 7's rule
says a tab is not syntax, so the block is unrecognized and its braces show:

::: compare

```carve
*x*{.a	.b}

*y*{	.c}

*z*{.d	}
```

```html
<p><strong>x</strong>{.a	.b}</p>
<p><strong>y</strong>{	.c}</p>
<p><strong>z</strong>{.d	}</p>
```

:::

A tab after an UNQUOTED value ends the value - `unquoted_value` holds letters,
digits, `-`, `_`, `.` and `:` and no whitespace at all - and then satisfies no
separator either, so the whole block fails. Inside a QUOTED value it is content,
as any other character is, and that half did not move:

::: compare

```carve
*x*{k=a	.b}

*y*{k="a	b"}
```

```html
<p><strong>x</strong>{k=a	.b}</p>
<p><strong k="a	b">y</strong></p>
```

:::

The blessed EMPTY block is a separate position rather than a use of the
separator, and it has to move with it: narrow the separator alone and `[x]{`
tab `}` is still a valid empty block, so the document below would keep passing
and pin nothing.

::: compare

```carve
[x]{	}
```

```html
<p>[x]{	}</p>
```

:::
