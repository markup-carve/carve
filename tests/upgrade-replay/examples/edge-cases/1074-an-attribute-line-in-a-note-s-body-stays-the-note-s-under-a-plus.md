---
page: edge-lists
---

## An attribute line in a note's body stays the note's under a plus

A note definition between a `+` and its block keeps every line at or past its body column, an attribute line included. The attribute line ends the note's paragraph and is dropped at the note's end, so it labels nothing outside the note, however far it is indented (PART 9 §15 A1, A4, CARVE-P9-067, carve#5957).

::: compare

````carve
- +
[^m]: n
	{y}

[^m]
````

````html
<ul>
  <li></li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
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
