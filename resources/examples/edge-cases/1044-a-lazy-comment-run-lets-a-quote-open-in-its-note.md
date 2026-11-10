---
page: edge-footnotes
---

## A lazy comment run lets a quote open in its note

The comment run starts below the note's body column and its closer misses that column too, so the run takes no lazy line and is refused (carve#5830 rule B). Its opener and closer stay literal note text, and the quote after them interrupts the note paragraph (PART 9 §10 I1, carve#5762).

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
{% a
%}</p>
      <blockquote><p>q
after</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
