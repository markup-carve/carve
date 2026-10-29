## Below a definition body's column the body ends

A definition body has three bands, and the boundary is its own content column
(PART 9, `BELOW THE BODY'S COLUMN THE BODY ENDS`). Below the column the body
ENDS and the line is classified in whatever context survives it. At the column
the line is the body's own block content. Past it a recognized opener takes its
authored column as that block's local base.

Column 0 is not a special case of the first band, it is the ordinary case: the
`dd` closes and the quote is the document's own.

::: compare

```carve
:: term
:  definition
> quote
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<blockquote><p>quote</p></blockquote>
```

:::

One and two columns in are the same band, and the surviving context here is the
document, where an opener must be written at column 0. The indented `>` and `#`
open nothing there, so the body does not end: they fold into its paragraph as
text, exactly as under a list item (carve#3295).

::: compare

```carve
:: term
:  definition
 > quote
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<blockquote><p>quote</p></blockquote>
```

:::

::: compare

```carve
:: term
:  definition
  # H
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<section id="H">
  <h1>H</h1>
</section>
```

:::

The band is about OPENERS, not about indentation. A line that opens nothing is
lazy paragraph text and folds into the body from any column, exactly as it does
under a list item.

::: compare

```carve
:: term
:  definition
  more
```

```html
<dl>
  <dt>term</dt>
  <dd>definition
more</dd>
</dl>
```

:::

At the body's column the quote is the body's own block content, and past it the
opener keeps its authored column as the block's base. Both nest.

::: compare

```carve
:: term
:  definition
   > quote
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <blockquote><p>quote</p></blockquote>
  </dd>
</dl>
```

:::

::: compare

```carve
:: term
:  definition
    > quote
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <blockquote><p>quote</p></blockquote>
  </dd>
</dl>
```

:::

"The surviving context" is not always the document. Inside a list item the body
ends the same way, and the quote is then measured against the ITEM's content
column, which it reaches - so it opens inside the item rather than inside the
`dd`. The base a block establishes governs that block, never the next opener
written below it.

::: compare

```carve
- intro

  :: term
  :  definition
   > quote
```

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>definition</dd>
    </dl>
    <blockquote><p>quote</p></blockquote>
  </li>
</ul>
```

:::
