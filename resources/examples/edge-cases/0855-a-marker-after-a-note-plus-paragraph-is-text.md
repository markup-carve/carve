---
page: edge-footnotes
---

## A marker after a note plus paragraph is text


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

The paragraph a marker-line `+` attaches stays open, and a footnote body opens no sublist under an open paragraph (PART 0 S4).

::: compare

```carve
[^a]: +
z
  - y

[^a]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>z</p>
      <ul>
        <li>y</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
