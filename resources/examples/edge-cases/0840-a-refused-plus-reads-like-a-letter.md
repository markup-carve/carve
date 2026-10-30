---
page: edge-lists
---

## A refused plus reads like a letter

A refused `+` has no structural effect a letter would not have (PART 9 §17 L4, CARVE-P9-067, carve#4396), so a list marker below a footnote body folds into the paragraph it forms, as it does under a letter.

:::: compare

```carve
[^a]: +
- b

r[^a]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
> [^a]: +
- b

r[^a]
```

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
- b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
- > a
  - +
# H
```

```html
<ul>
  <li>
    <blockquote><p>a
- +</p></blockquote>
  </li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

::::
