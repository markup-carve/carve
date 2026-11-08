---
page: edge-footnotes
---

## A losing interleaved note plus keeps the later note's body

An interleaved definition registers its label even when an earlier note's `+` looks past it. A duplicate of that label takes nothing (PART 9R R2). The paragraph stays in the later winning note.

::: compare

````carve
[^m]: +
[^n]: +
[^n]: +

  para

see[^m][^n]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>para<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
