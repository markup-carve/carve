## A real div in a container and the flush-left line after it

PART 1 S4 folds a flush-left line into the innermost open paragraph, and folds
nothing when there is none. A REAL `::: ` div - one whose opener passes PART 7's
separator test, so it is a block and not absorbed paragraph text - makes that
clause decide two ways depending on what the div holds when the line arrives.

An UNTERMINATED div holding a paragraph has an open paragraph in the stack, so
the flush-left line folds into it. An unterminated div holding NOTHING has none,
so the line ends the container instead. The two documents differ by one line of
body, and that line is the whole rule (carve#909).

::: compare

```carve
- item
  ::: note
  body
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note" aria-label="Note">
      <p>body
tail</p>
    </aside>
  </li>
</ul>
```

:::

The same shape with an empty div. Nothing in the stack holds an open paragraph
when `tail` arrives - the item's own paragraph was closed by the div that
followed it, and the div itself is empty - so S4 folds nothing and the line is a
top-level paragraph.

::: compare

```carve
- item
  ::: note
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL, and the reason the rule is about an UNTERMINATED div. Close the div and
the paragraph inside it closes with it, so the first document's answer inverts
on the strength of one `:::` line. This pins behavior that does not change.

::: compare

```carve
- item
  ::: note
  body
  :::
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note" aria-label="Note">
      <p>body</p>
    </aside>
  </li>
</ul>
<p>tail</p>
```

:::

A note on the spelling, because it is what made this look like a four-way split
when carve#909 was written. The shapes there are spelled `:::note`, with no
separator. PART 7 has since narrowed the colon fence's separator to a space
(carve#900, carve#905), so `:::note` no longer passes the opener test at all: it
is ABSORBED as paragraph text, and the answer for it comes from §12's absorption
rule and carve#902 rather than from S4. That row is already pinned by
`86-list-lazy-continuation-9` and already declared in
`resources/engine-pin-drift.txt`. The documents above use `::: note`, which is a
div.
