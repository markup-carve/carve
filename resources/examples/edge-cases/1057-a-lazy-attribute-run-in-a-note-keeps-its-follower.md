---
page: edge-footnotes
---

## A lazy attribute run in a note keeps its follower

A refused attribute run folded lazily into a note keeps its follower and the lazy line after it as paragraph text, as a comment run does (CARVE-P2-035, PART 0 S4, carve#5792).

::: compare

```carve
[^n]: p
{.a
.b}
  # q
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
{.a
.b}
# q
after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
