---
page: edge-lists
---

## Invisible note definitions do not loosen a list item

PART 9 §17 L1 and CARVE-P9-013 point 3: a footnote definition renders nothing in the item, and neither does its body: the line a `+` takes, a lazy line, or an indented continuation. A lead of only such lines is no first block, so a blank line after it does not make the item loose.

The reproduction: two note definitions lead the item, and the second one's `+` takes the next line. Both are invisible, so `y` is the item's first block and the blank before it does not loosen the list.

::: compare

````carve
- [^a]: seed
  [^b]: +
   x

  y[^a][^b]
````

```html
<ul>
  <li>y<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>seed<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>x<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Shape A: the note on the marker line takes the next line with `+`.

::: compare

````carve
- [^a]: +
  flush

  see[^a]
````

```html
<ul>
  <li>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Shape B: two notes split by a blank, the second with a lazy line.

::: compare

````carve
- [^a]: x

  [^b]: d2
  flush

  see[^a]
````

```html
<ul>
  <li>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A `+` line indented past the note's body column, in an item with a sibling.

::: compare

````carve
- [^a]: x

  [^b]: +
      indented

  see[^a][^b]
- next
````

```html
<ul>
  <li>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></li>
  <li>next</li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>indented<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An ordered item whose note takes a line one column in with `+`.

::: compare

````carve
1. [^a]: x
   [^b]: +
    one

   see[^a][^b]
2. next
````

```html
<ol>
  <li>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></li>
  <li>next</li>
</ol>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>one<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A visible paragraph before the note still makes `see` a second block, so this item is loose.

::: compare

````carve
- first

  [^a]: +
  flush

  see[^a]
````

```html
<ul>
  <li><p>first</p>
    <p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
