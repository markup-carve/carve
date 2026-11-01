---
page: edge-footnotes
---

## A task item reads a definition after extra box padding

CARVE-P9-083 (carve#4786). The checkbox is item content, and the spaces after it do not stop a block opener on the marker line. The definition remains invisible and resolves the later reference.

:::::: compare

`````carve
- [ ]  [^f]: x

r[^f]
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

The note host uses the same marker-line rule.

:::::: compare

`````carve
[^n]: - [ ]  [^f]: x

r[^n] [^f]
`````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul class="task-list">
        <li><input type="checkbox" disabled> </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>x<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

Ordinary task text remains a paragraph after the padding.

:::::: compare

`````carve
- [ ]  text
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="text"> text</li>
</ul>
```

::::::
