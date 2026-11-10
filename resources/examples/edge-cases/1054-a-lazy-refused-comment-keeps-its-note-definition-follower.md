---
page: edge-lists
---

## A lazy refused comment keeps its note definition follower

The comment continuation fails the brace-column test. The following note definition is read normally because the refused opener claims no follower (CARVE-P2-035, carve#5830).

::: compare

````carve
[^n]: p
{% a
%}
[^m]: q

x[^n]
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p
{% a
%}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
