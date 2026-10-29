## A definition below a footnote body's column is the document's own text

The fixture name predates the shared marker-body ruling. The one-space line misses the footnote content column but lazily continues its open paragraph under §24 C3. It remains literal text inside the note and registers no reference definition. The later document reference is unresolved.

::: compare

```carve
[^a]: note
 [r]: /u

see[^a] and [t][r]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
