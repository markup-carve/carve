## A container a lazy line folded into is still open

PART 1 S4's lazy branch ends "and NOTHING closes". That binds the lines AFTER
the folded one as much as the folded one itself: a line that comes back to the
container's content column is still that container's content, because nothing
in the stack was ever closed (markup-carve/carve#980).

Every document already pinned for this rule put the flush-left line LAST -
`270-a-real-div-in-a-container-and-the-flush-left-line-after-it` does, and so
does the block-quote category beside it. That spelling cannot tell a reader
that folds and stays open from one that folds and then closes, so the rows
below put a line after the fold, which is the only place the two differ.

::::: compare

```carve
- x
  :::
  a
d
  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a
d
b</p>
    </div>
  </li>
</ul>
```

:::::

Leaving the div unterminated does not change it. The fold and the reach are
the same rule either way, and the closer only matters to a line that arrives
after it:

::::: compare

```carve
- x
  :::
  a
d
  b
```

```html
<ul>
  <li>x
    <div>
      <p>a
d
b</p>
    </div>
  </li>
</ul>
```

:::::

THE CONTAINER KIND IS NOT A PARAMETER, here as in §24's clause. A block quote
inside the item folds and stays open the same way, and its `> ` prefix on the
line after the fold reaches the same quote rather than a second one:

::::: compare

```carve
- x
  > a
d
  > b
```

```html
<ul>
  <li>x
    <blockquote><p>a
d
b</p></blockquote>
  </li>
</ul>
```

:::::

The same quote written on the item's MARKER line is a third row, because a
marker-line container is collected through a different path:

::::: compare

```carve
- > a
d
  > b
```

```html
<ul>
  <li>
    <blockquote><p>a
d
b</p></blockquote>
  </li>
</ul>
```

:::::

CONTROL, and the sharp one. When NOTHING in the stack holds an open paragraph
the line still ENDS the container, and the line after it is outside too. An
empty `::: note` has no paragraph, and the item's own paragraph was closed by
the div opener, so both `d` and `b` are one top-level paragraph. This is the
answer that must not move when the rule above is implemented: a reader that
keeps the container open here has replaced one over-reach with another.

::::: compare

```carve
- x
  ::: note
d
  b
```

```html
<ul>
  <li>x
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
</ul>
<p>d
b</p>
```

:::::
