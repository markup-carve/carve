## Authored inline footnote reference IDs

An authored ID on an inline footnote replaces its generated reference ID. The endnote backlink points to the authored ID.

::: compare

```carve
^[n]{#x}
```

```html
<p><a id="x" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#x" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
