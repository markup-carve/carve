---
page: edge-definitions
---

## A quoted note run uses the lazy line written column

An unprefixed lazy continuation of a quoted note's block-position brace run supplies its written source column. One column past the opener makes the run valid block attributes (CARVE-P2-035, carve#5619).

:::::: compare

`````carve
> [^a]: +
> {#i
 .y}

see[^a]
`````

```html
<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
