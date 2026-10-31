---
page: edge-footnotes
---

## A marker after a note plus paragraph is text

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
      <p>z
- y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
