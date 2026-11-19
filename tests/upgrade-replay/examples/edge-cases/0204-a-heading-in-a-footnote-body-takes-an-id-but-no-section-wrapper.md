## A heading in a footnote body takes an id but no section wrapper

A heading inside a note is a heading: it gets the generated id every other heading gets, so a fragment link and an implicit reference can reach it. What it does NOT get is the `<section>` wrapper, which only applies at document level - a note is already inside an `<li>`.

::: compare

```carve
[^a]: note

  # H

  after

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <h1 id="H">H</h1>
      <p>after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
