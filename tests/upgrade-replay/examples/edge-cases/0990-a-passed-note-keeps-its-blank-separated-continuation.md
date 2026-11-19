---
page: edge-footnotes
---

## A passed note keeps its blank-separated continuation

A note whose definition stands in an earlier note's attached block keeps its own body across a blank. A refused `+` does not discard a continuation at the note body column (PART 9 §16 and §17).

::: compare

````carve
[^n]: +
[^m]: d1
[^k]: +
  para

  more

see[^n][^m][^k]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>para</p>
      <p>more<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A list split across that blank is one loose list in the note.

::: compare

````carve
[^n]: +
[^m]: d1
[^k]: +
  - list

  - other

see[^n][^m][^k]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <ul>
        <li><p>list</p></li>
        <li><p>other</p></li>
      </ul>
      <p><a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
