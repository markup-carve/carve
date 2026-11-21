## A tab reaches a footnote body's column just as two spaces do

A footnote body's own column is fixed at two ("A footnote body's own column is
two, and a third column is its text"), but *reaching* that column is column
arithmetic (§24 C1), not a count of space characters: a tab from column 0
lands at column 4, already past the floor, so it satisfies the same
requirement two literal spaces satisfy. A single space (column 1) still falls
short and leaves the note, as it already does today (carve#692).

::: compare

```carve
[^a]: note

	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A space then a tab reaches the same column (1, then to the next stop at 4), so
it qualifies too:

::: compare

```carve
[^a]: note

 	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The blank line above is not what admits the tab - the column requirement is
per line, so a tab-indented line directly under the definition, with no blank
line at all, is a continuation too (and, with no blank between them, it folds
into the same paragraph as a soft break, exactly as two spaces would):

::: compare

```carve
[^a]: note
	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
