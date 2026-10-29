## An absorbed colon fence leaves a block quote's paragraph open

The item form of PART 9 §12's absorption is pinned above, under *Lazy
continuation*. The BLOCK QUOTE form was not pinned anywhere, and it is the same
clause reached through a different container, so an engine could get the quote
wrong indefinitely without any document moving - which is what happened
(markup-carve/carve-rs#727).

`:::note` has no space between the fence and the type word, so §12's opener test
rejects it: it opens no block and is ordinary paragraph text. From that point
the paragraph **absorbs the next fence-shaped line as text too, instead of being
interrupted by it**. Nothing ever interrupted the quote's paragraph, so it is
still open when `tail` arrives at column 0, and PART 1 S4 folds `tail` in. The
quote's own prefix is missing on that line, which is exactly the partial match
S4 is written for:

::::: compare

```carve
> quote
> :::note
> body
> :::
tail
```

```html
<blockquote><p>quote
:::note
body
:::
tail</p></blockquote>
```

:::::

The absorption is **not width-tagged**. A four-colon run under a three-colon
`:::note` is fence-shaped too, and it is absorbed on the same terms - the
paragraph is not looking for a matching closer, because no block was ever
opened for it to close:

::::: compare

```carve
> quote
> :::note
> body
> ::::
tail
```

```html
<blockquote><p>quote
:::note
body
::::
tail</p></blockquote>
```

:::::

The malformed fence may be the quote's **first** line. There is no preceding
prose for the paragraph to have been opened by, so the absorbed line opens it -
and the rest follows unchanged:

::::: compare

```carve
> :::note
> :::
tail
```

```html
<blockquote><p>:::note
:::
tail</p></blockquote>
```

:::::

It holds at **depth two**, where the flush-left line matches neither prefix. S4
folds it into the innermost open paragraph rather than closing one quote per
missing marker:

::::: compare

```carve
> > quote
> > :::note
> > body
> > :::
tail
```

```html
<blockquote>
  <blockquote><p>quote
:::note
body
:::
tail</p></blockquote>
</blockquote>
```

:::::

Give the same fence its space and the answer inverts, exactly as it does in an
item: written `::: note` it is a valid opener, it interrupts the quote's
paragraph, and its closer completes the block - so nothing is open when `tail`
arrives. One space decides which of the two answers the same five lines get.
