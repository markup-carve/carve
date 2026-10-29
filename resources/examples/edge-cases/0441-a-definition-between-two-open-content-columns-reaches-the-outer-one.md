## A definition between two open content columns reaches the outer one

`- - x` opens items at content columns 2 and 4. A definition written at column 3
is at or past one of them and below the other, and PART 0's AT OR PAST MEANS THE
DEEPEST COLUMN THE LINE REACHES answers it against the column the line reaches:
it registers in the outer item, and `[r][]` resolves
(markup-carve/carve#1896).

All four neighbouring columns are pinned here rather than the divergent one
alone. A row that pinned only column 3 would leave the columns either side of it
free, and it is those neighbours that make the rule legible - and that showed the
other reading was a hole rather than a boundary. Read as the deepest container
still OPEN, column 3 would fold while 2 and 4 registered, so one added space
would remove a definition and a second would restore it.

Column 2, the outer item's content column.

::: compare

```carve
- - x
  [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

Column 3, strictly between the two. This is the column two engines read as lazy
text before the rule was stated.

::: compare

```carve
- - x
   [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

Column 4, the inner item's content column.

::: compare

```carve
- - x
    [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

Column 5, past the innermost column. The authored base is erased before the line
is parsed, so a definition past a column registers exactly as one at it does.

::: compare

```carve
- - x
     [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::
