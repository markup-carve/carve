---
page: edge-footnotes
---

## A description's first-block plus in a footnote body takes a paragraph at the note's body column

CARVE-P9-067 and PART 9 §17 L4 (carve#4255). The `: +` line and the paragraph stand at the note body's column, so the paragraph is the description's one block, as it is when the list sits in an item.

:::::: compare

`````carve
r[^n]

[^n]: n

    :: t
    : +
    after
    tail
`````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <dl>
        <dt>t</dt>
        <dd>after
tail</dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
