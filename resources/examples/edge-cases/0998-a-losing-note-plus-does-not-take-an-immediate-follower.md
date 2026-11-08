---
page: edge-footnotes
---

## A losing note plus does not take an immediate follower

A duplicate note marker takes nothing under PART 9R R2. The paragraph immediately below it stays in the earlier winning definition of the same label (carve#5538).

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
