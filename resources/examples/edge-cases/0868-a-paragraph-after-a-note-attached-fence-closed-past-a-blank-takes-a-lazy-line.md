---
page: edge-footnotes
---

## A paragraph after a note-attached fence closed past a blank takes a lazy line

PART 0 S4 (carve#4392). The note's paragraph after the fence is open, so a column-0 line folds into it, as it does when the fence closes with no blank before its closer.

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
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>a

</code></pre>
      <p>c
see<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
