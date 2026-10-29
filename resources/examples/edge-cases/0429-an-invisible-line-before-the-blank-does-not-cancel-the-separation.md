## An invisible line before the blank does not cancel the separation

L1b AN INVISIBLE LINE DOES NOT CANCEL THE SEPARATION is pinned in one line
order only. Corpus 186 writes the blank line first and the comment second; the
mirror - the invisible line first, the blank second - was never pinned, and a
rule whose answer turned on which of the two lines was authored first would
need a reason there is none of. L1b's own argument does not mention order: a
line that renders nothing "is not a separator, so the separation it appears to
interrupt is intact". The two paragraphs are separated by the blank line either
way, so the item is LOOSE either way.

::: compare

```carve
- para
  %% c

  more

x
```

```html
<ul>
  <li><p>para</p>
    <p>more</p>
  </li>
</ul>
<p>x</p>
```

:::

The other invisible kinds answer the same, which is what makes this one rule
rather than a comment rule. A link reference definition registers and leaves
the separation intact:

::: compare

```carve
- para
  [r]: /u

  more
```

```html
<ul>
  <li><p>para</p>
    <p>more</p>
  </li>
</ul>
```

:::

A footnote definition is the same answer one spelling over:

::: compare

```carve
- para
  [^f]: n

  more
```

```html
<ul>
  <li><p>para</p>
    <p>more</p>
  </li>
</ul>
```

:::

An attribute line is the row that shows the separation and the pending
metadata are independent: the item is loose for the same reason as above, and
A2 FLOAT FORWARD carries the attributes across the blank line onto the second
paragraph.

::: compare

```carve
- para
  {.k}

  more
```

```html
<ul>
  <li><p>para</p>
    <p class="k">more</p>
  </li>
</ul>
```

:::
