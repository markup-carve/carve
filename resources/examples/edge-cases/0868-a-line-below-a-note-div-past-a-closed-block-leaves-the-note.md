---
page: edge-model-followups
---

## A line below a note div past a closed block leaves the note

PART 9 §24 C3 (carve#4590). An item holding only an attribute block leaves no paragraph open.

:::::: compare

`````carve
[^n]: :::
  - {.x}
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
      <div>
        <ul>
          <li></li>
        </ul>
      </div>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
