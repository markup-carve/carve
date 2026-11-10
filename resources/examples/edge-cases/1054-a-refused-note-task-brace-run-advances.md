---
page: edge-footnotes
---

## A refused note task brace run advances

A refused brace run on a footnote task item's marker line remains literal text. Its first line advances the paragraph reader, and the following line stays in that item (CARVE-P2-035, carve#5811).

::: compare

```carve
[^q]: - [ ] {.x
            .y}
z

x[^q]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul class="task-list">
        <li><input type="checkbox" disabled aria-label="{.x .y} z"> {.x
.y}
z</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
