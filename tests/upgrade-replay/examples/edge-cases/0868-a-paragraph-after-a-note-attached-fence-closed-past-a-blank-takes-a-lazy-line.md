---
page: edge-footnotes
---

## A paragraph after a note-attached fence closed past a blank takes a lazy line

PART 9 §17 L3 (carve#5410). The indented fence line is not a closer at the attached fence's column. The first blank ends that fence, the indented line opens another, and the column-0 line leaves the note.

:::::: compare

`````carve
[^f]: +
```
a

  ```
  c
see

x[^f]
`````

```html
<p>see</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>a
</code></pre>
      <pre><code>c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
