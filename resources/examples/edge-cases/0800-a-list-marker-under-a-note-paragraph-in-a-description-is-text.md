---
page: edge-definitions
---

## A list marker under a note paragraph in a description is text


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

A list marker interrupts an open paragraph only as a tight sublist in a list item (PART 0 S3, carve#4160). A line that reaches a description body and misses the note inside it is text of the note's open paragraph, whatever the marker.

::: compare

```carve
:: t
:  [^q]: note
   * child

r[^q]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>child</li>
    </ul>
  </dd>
</dl>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
: [^q]: note
  1. child

r[^q]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>child</li>
    </ol>
  </dd>
</dl>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
: - a
  [^q]: note
  - [ ] child

r[^q]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
    <ul class="task-list">
      <li><input type="checkbox" disabled aria-label="child"> child</li>
    </ul>
  </dd>
</dl>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
: [^q]: note

  - child

r[^q]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>child</li>
    </ul>
  </dd>
</dl>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- [^q]: note
  * child

r[^q]
```

```html
<ul>
  <li>
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- [^q]: note

  * child

r[^q]
```

```html
<ul>
  <li>
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
