---
page: edge-footnotes
---

## A lazy attribute run in a note keeps its follower

A refused attribute run folded lazily into a note claims no follower. The following heading opens in the note, and the later column-zero line leaves the note (CARVE-P2-035, PART 0 S4, carve#5830, superseding carve#5792).

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
<p>after</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p
{.a
.b}</p>
      <h1 id="q">q</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
