## A flush-left line after a footnote definition belongs to the document

The fixture name predates the shared marker-body ruling. With an open paragraph and no blank, `b` lazily continues the footnote body under §24 C3. A `+` at the note's marker column still attaches one block (§17 L4).

::: compare

```carve
a
[^f]: note
b

see[^f]
```

```html
<p>a</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
