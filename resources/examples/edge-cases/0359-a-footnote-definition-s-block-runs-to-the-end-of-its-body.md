## A footnote definition's block runs to the end of its body

The rule is over the BLOCK, and a footnote definition's block is whatever the
footnote parser consumes - which may be more than one block of body. A blank
between the note's blocks is INTERIOR to that block, so it hands nothing back
to the container (markup-carve/carve#1363). The note's last paragraph is still
open, and a footnote body takes a lazy line like every container (markup-carve/carve#3885), so the flush-left line folds into it.

::: compare

```carve
- a
  [^f]: t

    more
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t</p>
      <p>more
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A LINK reference definition is the control, and it does not move. It has no
body, so its block is the one line: the blank falls OUTSIDE it, the indented
line below is the item's own second paragraph, and the flush-left line folds
into that. Every implementation already answers this way, which is what makes
it the control - the difference is the body, not the indentation and not the
blank:

::: compare

```carve
- a
  [r]: /u

    more
tail

[r][]
```

```html
<ul>
  <li><p>a</p>
    <p>more
tail</p>
  </li>
</ul>
<p><a href="/u">r</a></p>
```

:::
