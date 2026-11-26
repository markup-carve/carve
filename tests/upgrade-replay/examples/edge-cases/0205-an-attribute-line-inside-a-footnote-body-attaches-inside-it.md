## An attribute line inside a footnote body attaches inside it

A block-attribute line attaches to the block that follows it, wherever it was written. Inside a note body that is the note's own next block, and a dangling one at the end of the body attaches to nothing at all - it does not reach the document below (§15 A4).

::: compare

```carve
[^a]: note

  {.cls}
  styled

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p class="cls">styled<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
