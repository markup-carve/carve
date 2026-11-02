---
page: edge-model-followups
---

## A separator below a term in a note item stays term text

PART 9 §24 C3 (carve#4861). Column 0 misses the item that holds the term, so the line is read outside it.

:::::: compare

`````carve
- [^n]: - :: t
: p

[^n]
`````

```html
<ul>
  <li></li>
</ul>
<p>: p</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <dl>
            <dt>t</dt>
          </dl>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
