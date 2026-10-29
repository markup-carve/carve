## The flush-left line after a container a quoted line opened

The item form of PART 1 S4's *NO OPEN PARAGRAPH, NO LAZY LINE* is pinned above,
under *A real div in a container*. The BLOCK QUOTE form was not pinned anywhere
(markup-carve/carve#920), and the two containers were answering the same
question differently: a list item closed and put the flush-left line at top
level, while a block quote kept it.

The stack after `> ::: note` holds a quote and an EMPTY div. S4 asks whether ANY
container in it holds an OPEN paragraph, and none does - the quote's own
paragraph was closed by the div opener, and the div has no content yet. So
`tail` supplies no prefix, nothing is open for it to fold into, both containers
close, and it is a top-level paragraph:

::::: compare

```carve
> quote
> ::: note
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note" aria-label="Note">

  </aside>
</blockquote>
<p>tail</p>
```

:::::

Closing the div does not change the answer, because a CLOSED container holds no
open paragraph either. Both the empty form and the form with a body land the
same way, and they are the block-quote twins of the list-item documents above:

::::: compare

```carve
> quote
> ::: note
>
> :::
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note" aria-label="Note">

  </aside>
</blockquote>
<p>tail</p>
```

:::::

::::: compare

```carve
> quote
> ::: note
> body
> :::
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note" aria-label="Note">
    <p>body</p>
  </aside>
</blockquote>
<p>tail</p>
```

:::::

The last document is the one place §12's absorption and S4 meet, and they are
decided by WHOSE line it is. `:::note` has no separator, so it opens nothing and
is absorbed as paragraph text - and the quoted `> :::` under it is absorbed on
the same terms, which is what *An absorbed colon fence leaves a block quote's
paragraph open* pins. A FLUSH-LEFT `:::` is not one of the quote's lines: it
supplies no `>` prefix and would reach that paragraph only by S4's lazy fold.
The strict column-0 rule decides it instead. The quote closes and the line is
re-classified at top level, where it opens a div of its own:

::::: compare

```carve
> quote
> :::note
> body
:::
```

```html
<blockquote><p>quote
:::note
body</p></blockquote>
<div>

</div>
```

:::::
