## Delimited comments

`%%` runs to the end of its inline run, so mid-line commenting already works
wherever the structure supplies a boundary - a table cell ends at `|`, link text
at `]`. Plain prose supplies none. `{% … %}` is the form for it: it opens at
`{%`, closes at the first `%}`, and renders nothing.

::: compare

```carve
foo {% bar %} baz
```

```html
<p>foo  baz</p>
```

:::

It is transparent to the run it sits in, so a comment inside an emphasis span
does not break the span.

::: compare

```carve
*bo{% c %}ld* text
```

```html
<p><strong>bold</strong> text</p>
```

:::

The run may cross a soft line break inside one paragraph - the closer is what
ends it, not the line. It never joins two paragraphs across a blank line; `%%%`
is the block form for that.

::: compare

```carve
a {% one
two %} b
```

```html
<p>a  b</p>
```

:::

An UNTERMINATED opener stays literal text, so a document that opens a comment
and never closes it shows the braces rather than swallowing the rest of the
paragraph.

::: compare

```carve
a {% oops
```

```html
<p>a {% oops</p>
```

:::

There is no nesting: the run ends at the FIRST `%}`, and a `{%` inside is
ordinary comment text.

::: compare

```carve
a {% one {% two %} b
```

```html
<p>a  b</p>
```

:::

A code span is opaque, exactly as it is for `%%`.

::: compare

```carve
Run `a {% x %} b` then done.
```

```html
<p>Run <code>a {% x %} b</code> then done.</p>
```

:::

A backslash on the brace keeps the opener literal.

::: compare

```carve
a \{% not a comment %} b
```

```html
<p>a {% not a comment %} b</p>
```

:::

Both spellings still work where they already did, and they mean different
documents: `%%` takes the rest of the run, the braced form takes what its closer
encloses. The `.fmt` sidecar beside this pair pins that the writer reproduces
the spelling it was given rather than normalizing one into the other.

::: compare

```carve
| a {% hidden %} b | c |
|---|---|
| d %% tail | e |
```

```html
<table>
  <thead>
    <tr><th scope="col">a  b</th><th scope="col">c</th></tr>
  </thead>
  <tbody>
    <tr><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

:::

A delimited comment takes no inline attributes and does not join an attribute
run. An attribute block after it remains text, whether the comment is glued to
the preceding content or separated by a space (CARVE-P3-017, carve#2929).

::: compare

```carve
*x*{% c %}{.k}
```

```html
<p><strong>x</strong>{.k}</p>
```

```carve
[x]{% c %}{.k}
```

```html
<p>[x]{.k}</p>
```

```carve
a{% b %}{.c} d
```

```html
<p>a{.c} d</p>
```

```carve
[x] {% c %}{.k}
```

```html
<p>[x] {.k}</p>
```

:::
