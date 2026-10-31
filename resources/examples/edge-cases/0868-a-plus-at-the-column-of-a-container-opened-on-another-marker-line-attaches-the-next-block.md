---
page: edge-lists
---

## A plus at the column of a container opened on another marker line attaches the next block

PART 9 §17 L3 and CARVE-P0-024 S3 (carve#4359). A lone `+` at the marker column of an item or note opened on a description's, item's or note's marker line gives that container its next block. An item on a note's marker line stands at its authored marker column (carve#4623).

:::::: compare

`````carve
:: t
: - a
  +
  p
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a
        p
      </li>
    </ul>
  </dd>
</dl>
```

::::::

:::::: compare

`````carve
[^n]: - a
      +
      p

r[^n]
`````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>a
          p
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

`````carve
- [^m]: x
  +
  > q

r[^m]
`````

```html
<ul>
  <li></li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x</p>
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
