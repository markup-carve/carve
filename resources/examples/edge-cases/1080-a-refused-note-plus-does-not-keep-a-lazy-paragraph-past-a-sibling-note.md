---
page: edge-lists
---

## A refused note plus does not keep a lazy paragraph past a sibling note

A first-block `+` on a note definition attaches only a visible line at its marker column (CARVE-P9-067). When the next visible line after a sibling note stands elsewhere, the `+` is refused and changes no ownership: the sibling note ends the first note's body, an attribute line at the sibling's body column is the sibling's and closes its paragraph (PART 9 §15 A4), and a line short of that body column leaves the note for the nearest frame it reaches (PART 0 L3, S2), where no paragraph is open for it to continue (PART 0 L4). The attribute line has nothing to attach to and drops (carve#5994).

::: compare

```carve
1. x
   [^h]: +
   [^m]: n
     {#i}
    q

p[^m][^h]
```

```html
<ol>
  <li>x
    q
  </li>
</ol>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> [^h]: +
> [^m]: n
>   # z
>  q

p[^m][^h]
```

```html
<blockquote><p>q</p></blockquote>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <h1 id="z">z</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
