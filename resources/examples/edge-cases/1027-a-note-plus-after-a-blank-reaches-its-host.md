---
page: edge-definitions
---

## A note plus after a blank reaches its host

A lone `+` at a note's marker column reaches it after a blank and attaches the next block (PART 9 §17 L3/L4, carve#5639).

:::::: compare

`````carve
[^n]: h

+
pp

see[^n]
`````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>h</p>
      <p>pp<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
