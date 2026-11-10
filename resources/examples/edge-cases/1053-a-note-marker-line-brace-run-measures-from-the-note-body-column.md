---
page: edge-footnotes
---

## A note marker-line brace run measures from the note body column

On a note's marker line, an attribute or comment run measures its opening brace at the note's body column, not after the label. Continuations at column 4 continue the run, and so do continuations past the written brace (CARVE-P2-035, carve#5748).

::: compare

```carve
[^n]: {.x
    }
    z

r[^n]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p class="x">z<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: {% a
    {k=v}
    z %} y

r[^n]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p> y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: {% a
       {k=v}
       z %} y

r[^n]
```

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p> y<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
