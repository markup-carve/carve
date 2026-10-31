---
page: edge-model-followups
---

## A line below a note description past a closed block leaves the note

PART 9 §24 C3 (carve#4590). The description holds two headings, so no paragraph is open and the line closes the body.

:::::: compare

`````carve
[^n]: :: t
  : # H
    # I
z

[^n]
`````

```html
<p>z</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
        <dd>
          <h1 id="H">H</h1>
          <h1 id="I">I</h1>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
