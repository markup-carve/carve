## A quote is reached by its marker, and a column never reaches into one

Section 10 I5's columns are read against the container a line is IN. A line that
writes no `>` is in no block quote whatever column it lands on, because section
24 C5 composes the strips and the quote's strip is its marker. Such a line
reaches the quote only through PART 1 S4's lazy fold, so it is paragraph text:
it renders where it was written and registers nothing.

What made this look like two rules is that the same line answered differently by
what the quote HELD. With a list in the quote, the line lands on the inner item's
content column, where I5 would make a definition the item's - but it is not
inside the item any more than it is inside the quote (carve#1384).

::: compare

```carve
> - x
  [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>x</li>
  </ul>
</blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::

The same shape one container deeper now has a live outer list item even though
the line does not re-enter the quote. At column 4 it is an over-indented
definition in that outer item, so it registers under the authored-base rule.

::: compare

```carve
- > - x
    [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>x</li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

CONTROL. The quote's body is a PARAGRAPH, and the second line is byte for byte
the one above. It folds as text and defines nothing, which is what every reader
already did - it is the document that shows the quote's body was never the
parameter.

::: compare

```carve
> x
  [r]: /url

See [r][].
```

```html
<blockquote><p>x</p></blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::

CONTROL. Write the marker and the definition is inside the quote, where I5 gives
it to the item whose content column it sits at. The marker is the parameter.

::: compare

```carve
> - x
>   [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>x</li>
  </ul>
</blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::
