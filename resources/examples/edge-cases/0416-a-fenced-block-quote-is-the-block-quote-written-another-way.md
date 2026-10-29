## A fenced block quote is the block quote written another way

A colon fence whose type token is a bare `>` opens a block quote (PART 3,
`quote_block`). It is a second SPELLING, not a second block: the body is
ordinary block content and the node is the one the `>`-prefixed form produces,
so the tree is the same one and every rule that speaks of a block quote reaches
both. Third member of the sigil-fence family beside `::: |` and the hard-break
fence, taking the same required space before its token.

:::: compare

```carve
::: >
Notes:

- ship the parser
- then the renderer
:::
```

```html
<blockquote>
  <p>Notes:</p>
  <ul>
    <li>ship the parser</li>
    <li>then the renderer</li>
  </ul>
</blockquote>
```

::::

The fence nests in itself at CONSTANT width, because a typed opener is never
bare and only a bare equal-length line closes. Re-quoting is therefore
prepend-and-append: nothing already inside is renumbered.

:::: compare

```carve
::: >
Carol
::: >
Bob
:::
:::
```

```html
<blockquote>
  <p>Carol</p>
  <blockquote><p>Bob</p></blockquote>
</blockquote>
```

::::

The separator is a SPACE, as it is for every other colon-fence opener, so a
glued marker opens nothing and the line is paragraph text.

:::: compare

```carve
:::>
x
:::
```

```html
<p>:::&gt;
x
:::</p>
```

::::

The `^` caption line attaches to the CLOSING FENCE, and a captioned quote is a
`<figure>` in EITHER spelling: section 4 reads the node, and the two spellings
are one node. Without this the fenced form would be a worse block quote than the
prefixed one for no reason anybody chose - a `^ ` line after any other `:::`
closer is ordinary paragraph text, so an attribution that attaches to `> ` would
silently not attach here. Two container kinds take a closer caption now, this
one and the composite figure group.

:::: compare

```carve
::: >
Stay hungry, stay foolish.
:::
^ Steve Jobs
```

```html
<figure>
  <blockquote><p>Stay hungry, stay foolish.</p></blockquote>
  <figcaption>Steve Jobs</figcaption>
</figure>
```

::::

The canonical writer writes each quote back in the SPELLING IT WAS READ IN, so a
fenced quote holding nothing but a paragraph stays fenced rather than collapsing
to the prefixed form. That is what the `fenced` field on the node is for
(`resources/ast-schema.json`): the two spellings are one node, the field records
which one, and without it the writer would have to infer a spelling from the
body and would re-canonicalize every document that chose the other. The `.fmt`
sidecars beside these cases pin the bytes.

:::: compare

```carve
::: >
hello
:::
```

```html
<blockquote><p>hello</p></blockquote>
```

::::
