## A quote holding a captioned block indents it like any other nested block

PART 10 section 4 BLOCK WHITESPACE names `figure` among the nested block
structures that indent their children by two spaces per nesting level, and a
caption makes its host a figure (PART 9 section 4b). So a quote whose only child
is a captioned image holds a three-line `<figure>`, and that figure is indented
inside the `<blockquote>` exactly as a quoted list, table, admonition, nested
quote or captioned code block already is.

The executable spec put all three lines on the quote's own line, emitting
`<blockquote><figure>` and closing `</figure></blockquote>`, because it chose the
compact one-line form for a quote whose single child is a paragraph and a
captioned paragraph is still a paragraph. It was the one shape in that renderer
where a multi-line child went un-indented, and no document in any of its three
populations reached it (carve#1575).

The uncaptioned quote below is the compact form the same rule keeps: its single
child renders on one line, so it stays on the quote's line.

::: compare

```carve
> ![a](i.png)
> ^ cap

> plain
```

```html
<blockquote>
  <figure>
    <img src="i.png" alt="a">
    <figcaption>cap</figcaption>
  </figure>
</blockquote>
<blockquote><p>plain</p></blockquote>
```

:::
