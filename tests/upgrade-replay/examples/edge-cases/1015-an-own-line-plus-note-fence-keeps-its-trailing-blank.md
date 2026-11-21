---
page: edge-definitions
---

## An own-line plus note fence keeps its trailing blank

PART 0 S1 step 3 ends an unclosed fence at its first blank only for a marker-line `+` (carve#5560). An own-line `+` leaves the fence open through an interior blank and the trailing blank.

:::::: compare

`````carve
[^a]: p
+
```
code

  tail

see[^a]
`````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p</p>
      <pre><code>code

  tail

</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
