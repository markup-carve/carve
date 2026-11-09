---
page: edge-lists
---

## An unclosed backtick follower stays in a note paragraph

The continuation at the opening brace's column refuses the attribute run. The unclosed backtick follower and its payload remain in the attached paragraph through the first blank (CARVE-P2-035, carve#5549).

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
<p>tail</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>{.x
.y}
<code>
wa</code><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
