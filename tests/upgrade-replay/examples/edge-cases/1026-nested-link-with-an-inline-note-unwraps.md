---
page: edge-inline
---

## Nested link with an inline note unwraps

An inner link is unwrapped even when its text includes an inline note (CARVE-P12-007; carve#5666).

:::: compare

```carve
[[ ^[b]]()]()
```

```html
<p><a href=""> <sup id="fnref1">1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
