---
page: edge-lists
---

## A lazy line after a narrower list in a note folds into its item

A note body list after a list with a wider content column is a new list (§10 I2), and a later line below the note body column is a lazy line of that list item's open paragraph (PART 0 S4). The note reads it as its description twin does, and the line keeps no framing (carve#4259).

:::: compare

```carve
[^a]: 1. +
  - y
tail

r[^a]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ol>
        <li></li>
      </ol>
      <ul>
        <li>y
tail</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
[^a]: x

  10. a
  - y
tail

r[^a]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x</p>
      <ol start="10">
        <li>a</li>
      </ol>
      <ul>
        <li>y
tail</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
[^a]: 10. a
  * y
 tail

r[^a]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ol start="10">
        <li>a</li>
      </ol>
      <ul>
        <li>y
tail</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
