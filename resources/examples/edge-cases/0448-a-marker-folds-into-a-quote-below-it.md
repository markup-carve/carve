## A marker folds into a quote below it

An unmarked line at an ENCLOSING item's content column, with a quote below it
holding the innermost open paragraph, is lazy paragraph text in that quote's
paragraph. A list marker there folds like any other text and renders where it was
written (markup-carve/carve#1905).

A quote is reached by its marker and a column never reaches into one, so the line
is in no quote whatever column it lands on, and PART 0's lazy fold is the only
route by which it touches one. The reach question PART 0's AT OR PAST MEANS THE
DEEPEST COLUMN THE LINE REACHES answers therefore does not arise for the quote,
and §24 C3's content-column branch -- a marker there opens a sublist -- is never
reached, because it asks what a line does IN a container and this line is never
classified in the item.

The twins and the controls are pinned here beside the folds rather than the
divergent documents alone. Their absence is why this drifted: the paragraph twin
has always folded at this column in every reader, and the no-quote shapes have
always opened a list element with no blank line before it. Neither may move.

The ticket's document. The quote is written BELOW the item's lead line, and
`  - m` sits at column 2 -- the outer item's content column, and below the
quote's content column of 4. The marker folds into the quoted item's paragraph
and renders as text.

::: compare

```carve
- a
  > - x
  - m
```

```html
<ul>
  <li>a
    <blockquote>
      <ul>
        <li>x
- m</li>
      </ul>
    </blockquote>
  </li>
</ul>
```

:::

The MARKER-LEAD spelling of the same geometry, where the quote sits on the
item's lead line instead of below it. Same answer: which line the quote was
written on is not a parameter of this rule.

::: compare

```carve
- > - x
  - m
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>x
- m</li>
      </ul>
    </blockquote>
  </li>
</ul>
```

:::

The sharpest case. Once the fold has started, intervening prose does not
escape the quote: `p` folds, the fold leaves the quote open for the line after
it, and the marker folds too.

::: compare

```carve
- a
  > - x
  p
  - m
```

```html
<ul>
  <li>a
    <blockquote>
      <ul>
        <li>x
p
- m</li>
      </ul>
    </blockquote>
  </li>
</ul>
```

:::

The PARAGRAPH TWIN, which every reader already folds at this exact column.
Replacing the quoted list with quoted prose changes nothing, which is why ruling
the marker out of the fold would have had to move this document as well.

::: compare

```carve
- a
  > q
  - m
```

```html
<ul>
  <li>a
    <blockquote><p>q
- m</p></blockquote>
  </li>
</ul>
```

:::

CONTROL -- a BLANK LINE is the escape, and the only one. It ends the quote
and every column opened inside it, so the marker below is classified in the item
and opens a list there.

::: compare

```carve
- a
  > - x

  - m
```

```html
<ul>
  <li>a
    <blockquote>
      <ul>
        <li>x</li>
      </ul>
    </blockquote>
    <ul>
      <li>m</li>
    </ul>
  </li>
</ul>
```

:::

CONTROL -- an item where the quote was. The line is classified in the
enclosing item, so the marker opens a sibling with no blank line before it.

::: compare

```carve
- a
  - b
  - m
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>m</li>
    </ul>
  </li>
</ul>
```

:::

CONTROL -- a heading where the quote was. It leaves no paragraph open, and
the marker at the content column opens a sublist.

::: compare

```carve
- a
  # h
  - m
```

```html
<ul>
  <li>a
    <h1 id="h">h</h1>
    <ul>
      <li>m</li>
    </ul>
  </li>
</ul>
```

:::

CONTROL -- a fence where the quote was. Same answer, and the fence kind does
not enter into it.

::: compare

````carve
- a
  ```
  c
  ```
  - m
````

```html
<ul>
  <li>a
    <pre><code>c
</code></pre>
    <ul>
      <li>m</li>
    </ul>
  </li>
</ul>
```

:::

CONTROL -- a paragraph where the quote was. That paragraph IS the item's, so
§24 C3 governs at the content column and the marker opens a sublist. This is the
row that shows the rule is about the QUOTE rather than about the column.

::: compare

```carve
- a
  p
  - m
```

```html
<ul>
  <li>a
p
    <ul>
      <li>m</li>
    </ul>
  </li>
</ul>
```

:::
