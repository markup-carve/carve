---
page: edge-lists
---

## A plus after a note in an item gives the note its list

PART 9 §17 L3, CARVE-P9-067 and carve#4440. A `+` at a note's marker column offers the note the next block, and a list attaches in every host except a list item, so an enclosing item or description does not take it.

:::: compare

````carve
- a
  [^n]: note
  +
  1. ordered

see[^n]
````

```html
<ul>
  <li>a</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ol>
        <li>ordered</li>
      </ol>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

````carve
:: t
: x
  [^n]: note
  +
  - b

see[^n]
````

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
