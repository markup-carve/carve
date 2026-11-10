---
page: edge-definitions
---

## A tabbed nested note keeps document references

The ownership walk closes the nested note when a column-zero reference misses it. The note body reader must stop at the same boundary (PART 0 S2, PART 9 §24 C5, carve#4085).

::: compare

```carve
[^n]: a
  [^n]: a
  	::: |
[^n]

[^n]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p><a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::
