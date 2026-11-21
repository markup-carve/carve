## An unterminated container does not extend the item past a blank line

A blank line ends the open paragraph, whatever container stands above it. PART 1
S4 then has nothing to continue, so a following line BELOW the item's content
column is not the item's: it stands at the enclosing document's own opener
column, and the item ends there. The state of the container above the blank does
not enter the question - an unterminated `:::` div reaches no further past a
blank than a terminated one, an opaque body, a quote, or no container at all.

The executable spec answered the unterminated spelling alone. It carried the
blank as container content and left the item's paragraph open across it, so a
flush-left line folded into the div as a second paragraph, while the terminated
div, the code fence, the quote and the bare item all ended the item on the same
input. One rule was being answered two ways by whether a closer had been
written. carve-js, carve-php and carve-rs end the item in every spelling
(carve#1379).

::: compare

```carve
- ::: d
  b

tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
    </div>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Without the blank the paragraph `b` opened is still open, so the same
flush-left line folds into it under S4's lazy branch and nothing closes. The
blank is what decides, not the unterminated container - a reader that ended the
item whenever a `:::` was left open would answer this one wrong.

::: compare

```carve
- ::: d
  b
tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b
tail</p>
    </div>
  </li>
</ul>
```

:::

CONTROL. The blank ends the paragraph, not the ITEM. Content that returns at the
item's content column is still inside the div, as its second block - so a reader
that closed the item on any blank line inside an open container would answer this
one wrong in the other direction.

::: compare

```carve
- ::: d
  b

  tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
      <p>tail</p>
    </div>
  </li>
</ul>
```

:::

An explicit closer is a SPELLING CHANGE, and the document above is where that
gets tested. Writing the `:::` it left open ends the container exactly where the
item already ended it, so the two spellings are one document: the same blocks,
in the same order, under the same list. The list's TIGHTNESS is part of that,
and this is the spelling the canonical writer emits for the document above, so
PART 11 §1's `parse(fmt(x)) == parse(x)` says outright that supplying the closer
cannot move it.

The fixture below cannot say any of this. It is byte-identical to the one above,
because the item's blocks sit inside the div and a tight list's paragraph
suppression never reaches them - so tightness leaves no mark in the HTML, and a
check comparing rendered output here passes under either reading. The pair is
pinned at the PARSE level instead, by
`tests/an-explicit-closer-does-not-move-list-tightness.test.mjs`.

What the rule settles is that the two spellings AGREE, not which of tight or
loose they agree on. carve-js and carve-rs read the open spelling as loose and
the closed one as tight, contradicting themselves rather than each other, and
converge on loose; carve-php already reads both loose; the executable spec reads
both tight, which is self-consistent and therefore conforms. Whether an item
whose only child is a container holding a blank line is loose at all is a
separate question and stays open (carve#1602).

::: compare

```carve
- ::: d
  b

  tail
  :::
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
      <p>tail</p>
    </div>
  </li>
</ul>
```

:::

THE SAME PRODUCTION, ONE CONFIGURATION OVER. Above, the container is the item's
LEAD, so every block the item holds sits inside it and a tight list's paragraph
suppression never reaches any of them - which is why that pair renders
byte-identically under either reading and had to be pinned at the parse level.
Move the container BELOW a lead block and the item keeps a paragraph of its own,
and that paragraph is exactly what suppression does reach: a loose item wraps `x`
in `<p>`, a tight one leaves it bare. So this configuration PRINTS the tightness
the other one hides, and an ordinary `.html` fixture can hold the rule.

The reading is TIGHT, and it is the missing closer that has to not matter. The
blank line is inside the div, so nothing separates the item's blocks and §17 L1
finds no separator to loosen on; writing the `:::` the document leaves open ends
the container where the item already ended it, so the two spellings are one
document and the tightness cannot move across them (carve-js#1376, carve-js#1379).

::: compare

```carve
- x
  :::
  a

  b
```

```html
<ul>
  <li>x
    <div>
      <p>a</p>
      <p>b</p>
    </div>
  </li>
</ul>
```

:::

The closed spelling of the document above. Here PART 11 §1's
`parse(fmt(x)) == parse(x)` and §1a's weaker HTML form say the same thing, which
they do not in the pair further up: the item's lead paragraph puts the tightness
into the output, so a reader that moved it across the closer is caught by the
rendered bytes rather than only by the parse.

::: compare

```carve
- x
  :::
  a

  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a</p>
      <p>b</p>
    </div>
  </li>
</ul>
```

:::
