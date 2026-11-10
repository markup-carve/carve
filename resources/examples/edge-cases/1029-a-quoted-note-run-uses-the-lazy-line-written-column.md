---
page: edge-definitions
---

## A quoted note run uses the lazy line written column

The unprefixed continuation misses the quoted note, so it cannot complete a block-position run. The opener is literal text (CARVE-P2-035, carve#5830).

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
      <p>{<span class="tag"><strong>#i</strong></span>
.y}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
