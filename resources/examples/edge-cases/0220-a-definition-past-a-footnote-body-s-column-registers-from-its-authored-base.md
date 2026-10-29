## A definition past a footnote body's column registers from its authored base

Three spaces is a continuation, so the line belongs to the note. Because a recognized opener may establish an authored base past the minimum column, the link definition registers from there and remains invisible. The one-space control above still leaves the body and stays literal.

::: compare

```carve
[^a]: note
   [r]: /u

see[^a] and [t][r]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
