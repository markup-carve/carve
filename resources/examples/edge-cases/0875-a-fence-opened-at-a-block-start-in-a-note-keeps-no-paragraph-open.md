---
page: edge-definitions
---

## A fence opened at a block start in a note keeps no paragraph open

CARVE-P9-083 (carve#4627). A fence a marker line opens inside a footnote body is open to the end of its container, and an open fence is no paragraph, so a column-zero line below the note's body column leaves the note.

:::::: compare

`````carve
[^0]: :::
  - ```
x

[^0]
`````

```html
<p>x</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <div>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </div>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

`````carve
[^0]: > x

  1. ~~~
y

[^0]
`````

```html
<p>y</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>x</p></blockquote>
      <ol>
        <li>
          <pre><code></code></pre>
        </li>
      </ol>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
