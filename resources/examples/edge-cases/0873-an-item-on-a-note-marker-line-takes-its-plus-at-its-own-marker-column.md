---
page: edge-lists
---

## An item on a note marker line takes its plus at its own marker column

PART 9 §17 L3 (CARVE-P9-067) and CARVE-P9-083 (carve#4623). An own-line `+` under an item opened on a note's marker line is measured at the item's authored marker column, as the marker-line form is. At the note's body column it is refused and stays a letter.

:::::: compare

`````carve
[^a]: - i
      +
      x

[^a]
`````

`````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>i
          x
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
`````

::::::

:::::: compare

`````carve
[^n]: - a
  +
  p

r[^n]
`````

`````html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>a
+
p</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
`````

::::::
