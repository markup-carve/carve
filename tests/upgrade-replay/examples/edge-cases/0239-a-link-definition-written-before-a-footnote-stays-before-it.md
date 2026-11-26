## A link definition written before a footnote stays before it

§7 orders collected definitions by source position, and PART 11 §6 binds the writer to the order the tree holds. The corpus pinned only the shape where the footnote comes first (`a definition on a footnote body's continuation line`), and a writer that emits footnotes in a fixed position - first or last - is correct on exactly that shape. This is its mirror: every engine's `carve` output for it must put the link definition first, because the author did.

::: compare

```carve
see[^a] and [t][r]

[r]: /u

[^a]: note
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
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

Two definitions of the SAME kind pin the other half of the rule: a writer that sorts them by label rather than by position reverses these two.

::: compare

```carve
see[^b] and[^a]

[^b]: bee

[^a]: ay
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>bee<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>ay<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
