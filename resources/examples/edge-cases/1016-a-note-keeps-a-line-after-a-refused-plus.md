---
page: edge-definitions
---

## A note keeps a line after a refused plus

A refused continuation ends the attached list and its open fence. The note retains a following line at its body column (PART 0 S4, carve#5601).

:::: compare

````carve
[^a]: +
- li
  ```
+
  p

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>li
          <pre><code></code></pre>
        </li>
      </ul>
      <p>p<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
