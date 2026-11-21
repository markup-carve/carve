---
page: edge-lists
---

## A tab-led attribute line in a note a nested plus passes stays the note's

A tab in a leading run restarts its stop at every frame column (PART 9 §24 C5). After the outer item's three columns, the tab reaches column 7, past the note's body column, so the attribute line is the note's: it labels nothing outside the note, and the plus attaches `q`, the next visible line at its marker column (PART 9 §15 A4, CARVE-P9-067, carve#5963).

::: compare

````carve
1. x
   1. +
   [^m]: n
   	{#i}
   q

p[^m]
````

````html
<ol>
  <li>x
    <ol>
      <li>q</li>
    </ol>
  </li>
</ol>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
