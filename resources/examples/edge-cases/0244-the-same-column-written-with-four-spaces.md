## The same column, written with four spaces

The control for the rule above, and the half that was stated rather than
checked. That pair pins the tab against the THREE-space spelling. What makes
the tab case decidable is the other comparison: a
tab reaches column 4, four spaces reach column 4, so the two are the same claim
and must get the same answer.

Without this document an engine can pass both halves of that pair while still
answering column 4 differently depending on which whitespace arrived there -
which is the exact shape of the defect the rule was written for (carve-js#767,
carve-php#890).

::: compare

```carve
1. a
    > quote
```

```html
<ol>
  <li>a
    <blockquote><p>quote</p></blockquote>
  </li>
</ol>
```

:::
