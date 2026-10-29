## A below-column term stays in the footnote paragraph

The note's content column is two. At column one, `:: term` is ordinary text.
The open note paragraph claims it before block recognition. A blank line then
ends the note, leaving the reference in the document.

::: compare

```carve
[^f]: alpha
 :: term

See[^f]
```

```html
<dl>
  <dt>term</dt>
</dl>
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>alpha<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
