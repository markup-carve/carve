## Multiple footnote backlinks follow inline content

::: compare

```carve
a[^n] b[^n]

[^n]: Note
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b<a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::
