---
page: edge-footnotes
---

## A losing note plus keeps a later sibling outside the note

A losing definition's `+` takes nothing (PART 9R R2). The winning note's indented list is one attached block; the later root-column list marker opens outside the note (PART 9 §17 L3).

::: compare

````carve
[^n]: +
[^n]: +
  - item
- sibling

see[^n]
````

```html
<ul>
  <li>sibling</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>item</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
