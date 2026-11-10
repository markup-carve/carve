---
page: edge-footnotes
---

## A lazy comment run lets a quote open in its note

The comment run starts below the note's body column and its closer is indented past the opening brace, so the run is a valid invisible comment. The quote after it interrupts the note paragraph (CARVE-P2-035, PART 9 §10 I1, carve#5762).

::: compare

```carve
[^n]: p
{% a
 %}
   > q
after

x[^n]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p
</p>
      <blockquote><p>q
after</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
