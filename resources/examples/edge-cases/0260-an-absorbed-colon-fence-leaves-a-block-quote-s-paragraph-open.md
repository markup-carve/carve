## An absorbed colon fence leaves a block quote's paragraph open

`:::note` has no space between the fence and the type word, so §12's opener test
rejects it: it opens no block, is ordinary paragraph text and leaves no state.
The bare run below it is read on its own (carve#4863). It interrupts the quote's
paragraph and opens an empty div, so nothing is open when `tail` arrives at
column 0, and the line leaves the quote:

::::: compare

```carve
> quote
> :::note
> body
> :::
tail
```

```html
<blockquote>
  <p>quote
:::note
body</p>
  <div>

  </div>
</blockquote>
<p>tail</p>
```

:::::

A run of another width reads the same way:

::::: compare

```carve
> quote
> :::note
> body
> ::::
tail
```

```html
<blockquote>
  <p>quote
:::note
body</p>
  <div>

  </div>
</blockquote>
<p>tail</p>
```

:::::

The malformed fence may be the quote's **first** line:

::::: compare

```carve
> :::note
> :::
tail
```

```html
<blockquote>
  <p>:::note</p>
  <div>

  </div>
</blockquote>
<p>tail</p>
```

:::::

It holds at **depth two**:

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
  <blockquote>
    <p>quote
:::note
body</p>
    <div>

    </div>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::::

Give the same fence its space and the two lines between become its body: written
`::: note` it is a valid opener and the run is its closer. `tail` leaves the quote
in both spellings.
