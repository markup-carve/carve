## A list marker at the content column inside an open fence

A line that LOOKS like a list marker, sitting AT the item's content column
inside an open code fence, is CODE TEXT. PART 9 §24's STEP walk decides it with
no new rule, and neither of the two steps involved ever reads the line's first
character.

Take `  - x` with the stack `document > list > item(content_column 2) > code
fence body`:

- **S1 MATCH PREFIXES** consumes each container's prefix in turn. The line
  supplies the item's two columns, so the walk reaches the item; a fenced body
  demands no per-line prefix, so the walk reaches that too and stops there.
- **S2 FENCED BODY** therefore fires - the innermost MATCHED container IS the
  fenced body - and the line is verbatim content unless it matches that fence's
  where-guarded closer. "No other rule applies to L." A marker is never asked
  about.

The plain-text sibling is already pinned and already passes:
`276-a-fence-opened-on-a-list-marker-line-body-below-the-content-column-3` puts
`x` at this exact column and gets a code block holding `x`. The only difference
here is which character follows the indentation, and no step of the walk looks
at it. A reader that answers the two differently is recognizing a marker before
it has established that the line is markup at all.

::::: compare

````carve
- ```
  - x
  ```
````

```html
<ul>
  <li>
    <pre><code>- x
</code></pre>
  </li>
</ul>
```

:::::

The same rule with the fence opened after a BLANK line inside the item rather
than on the marker line. It is a SEPARATE row because readers reach the two
through different machinery - one continues the item from its marker line, the
other collects the item's content after a blank - so a fix applied to one is
invisible to the other. A single row would let half of this rule stay broken and
still read as done, which is the failure carve-php#1003 had to correct and the
reason the ruling on carve-php#1007 asked for both shapes at once.

The item stays TIGHT and `a` stays bare: PART 9 §17 L2 names fenced code among
the sub-blocks a blank line attaches WITHOUT loosening, and no second paragraph
ever appears here.
`164-tight-list-item-keeps-trailing-text-after-a-block-bare-3` is this same
opening plus a trailing paragraph, and that paragraph is what loosens it there.

::::: compare

````carve
- a

  ```
  - x
  ```
````

```html
<ul>
  <li>a
    <pre><code>- x
</code></pre>
  </li>
</ul>
```

:::::

Both rows are carried by the engine tickets rather than presented as a
cross-reader agreement. No engine answers both shapes this way today, and the
three do not fail on the same one, so a red engine corpus job against these two
is the measurement the engine work is made against rather than a regression.
