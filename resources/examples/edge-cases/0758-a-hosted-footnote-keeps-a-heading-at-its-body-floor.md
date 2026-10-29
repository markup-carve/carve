## A hosted footnote keeps a heading at its body floor

:::: compare

```carve
- a
  [^n]: +
  # h
    # h

see[^n]
```

```html
<ul>
  <li>a
    <h1 id="h">h</h1>
  </li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <h1 id="h-2">h</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
