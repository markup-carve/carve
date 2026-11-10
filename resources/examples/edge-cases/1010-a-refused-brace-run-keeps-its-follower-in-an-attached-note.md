---
page: edge-lists
---

## A refused brace run keeps its follower in an attached note

The continuation fails the brace-column test. The attached note keeps the literal opener; the following heading is read normally (CARVE-P2-035, carve#5830).

::: compare

````carve
[^a]: +
{.x
.y}
# h

see[^a]
````

```html
<section id="h">
  <h1>h</h1>
  <p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>{.x
.y}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
