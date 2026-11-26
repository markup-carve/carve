## An escaped hash keeps its escape at a container's content position

PART 11 §8b M2b is decided on the EMITTED LINE, so a container prefix is passed
over before the position is read. A hash at the start of a block quote's or a
list item's content opens an ATX heading exactly as one at column 0 does, and
its escape is kept there. All three engines dropped it, and a round trip through
the Markdown target turned the author's text into a heading
(markup-carve/carve#1330).

The narrowing itself does not move, which is the half a correction here is most
likely to lose. A hash the prefix does not put at the content position is still
emitted bare, and so is one that stands there but opens no heading, since M2b's
reading is CommonMark's and a run closed by a letter is not a heading. This pair
carries both directions.

::: compare

```carve
> \# heading
>
> C\# is a language

- \# heading
- \#tag rest
```

```html
<blockquote>
  <p># heading</p>
  <p>C# is a language</p>
</blockquote>
<ul>
  <li># heading</li>
  <li>#tag rest</li>
</ul>
```

:::

Nesting needs no rule of its own: the prefix is whatever the writer emitted,
`> > ` included. Neither does lazy continuation, which is a parser concept - this
writer re-prefixes every line of a container, so the last line below is emitted
with its `> ` and read at the content position like any other.

::: compare

```carve
> > \# deep

> a
\# heading
```

```html
<blockquote>
  <blockquote><p># deep</p></blockquote>
</blockquote>
<blockquote><p>a
# heading</p></blockquote>
```

:::
