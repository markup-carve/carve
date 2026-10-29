## A comment fence at an item's content column registers nothing either

`%%%` at a list item's content column is the same construct as `%%%` at column 0. PART 9 §24 S1 places a line by the column it REACHES and never by its first character, S2 makes a line verbatim as soon as the innermost matched container is a fenced body, and §28 makes a comment fence's body verbatim and invisible. Not one of the three is scoped to column 0, so what "A definition inside a comment registers nothing" states above holds wherever the fence sits: the label is not registered, and the reference to it stays literal.

::: compare

```carve
- item
  %%%
  [r]: /url
  %%%

[r][]
```

```html
<ul>
  <li>item</li>
</ul>
<p>[r][]</p>
```

:::

The corpus stated the rule and pinned only the column-0 spelling, which is the gap two engines drifted through while staying green: carve-rs and carve-php both collected the label here and resolved the reference, where carve-js and the executable spec leave it literal (carve#1309, markup-carve/carve-rs#1047, markup-carve/carve-php#1349). carve-rs has since been fixed and reproduces this document (markup-carve/carve-rs#1052); carve-php still collects the label. Nothing about the item's own rendering was ever in question - all three render the comment as nothing and the item as `item`. The disagreement is entirely in the link table, which is why the document has to be read past the list to see it at all.
