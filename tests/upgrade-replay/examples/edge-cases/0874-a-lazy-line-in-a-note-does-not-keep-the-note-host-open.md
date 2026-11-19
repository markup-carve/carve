---
page: edge-definitions
---

## A lazy line in a note does not keep the note host open

CARVE-P9-083 (carve#4632). A lazy line folds into a footnote's paragraph and changes no owner. When a block below it closes that paragraph, a line below the body's column closes the body, as it does without the lazy line.

:::::: compare

`````carve
:: t
: - [^3]: a
z
      # H
]

[^3]
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li></li>
    </ul>
  </dd>
</dl>
<p>]</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a
z</p>
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

`````carve
- :: t
  : [^3]: a
z
          ```
          c
          ```
  m

[^3]
`````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd></dd>
    </dl>
    m
  </li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a
z</p>
      <pre><code>c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
