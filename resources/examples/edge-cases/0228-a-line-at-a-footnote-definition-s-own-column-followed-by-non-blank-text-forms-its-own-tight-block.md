## A line at a footnote definition's own column, followed by non-blank text, forms its own tight block

The fixture name records the earlier reading. The footnote definition is invisible in the item, but its own open paragraph can take a below-column lazy line under §24 C3. That line is note text rather than a second item paragraph. The item stays tight because it has no blank-separated second paragraph.

::: compare

```carve
- a
  [^f]: x
  more

see[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x
more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
