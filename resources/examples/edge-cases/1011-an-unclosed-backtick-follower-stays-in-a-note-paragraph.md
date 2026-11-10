---
page: edge-lists
---

## An unclosed backtick follower stays in a note paragraph

The brace opener is literal. The following backtick fence opens as a separate block and keeps its own payload (CARVE-P2-035, carve#5830).

::: compare

````carve
see[^a]

[^a]: +
{.x
.y}
```
wa


tail
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<pre><code>wa


tail
</code></pre>
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
