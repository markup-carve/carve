## A nested note's floor is two columns past its own marker

A footnote body starts two columns past the definition that opened it, and the
definition's OWN column is what those two columns are counted from. Between a
nested note's marker and its floor there is a band that belongs to no line of
that note: PART 0's owner selection hands it to the nearest surviving ancestor,
which is the note outside it (markup-carve/carve#1971).

Below the nested note's floor, a definition ends it. `[r]` sits at column 2 and
`[^g]` at 3, so the note's floor is 5 and the definition is outside it - it is
consumed by the outer note, and `[t][r]` resolves there.

::: compare

```carve
[^f]: outer

   [^g]: mid
  [r]: /url

x[^f] [^g] [t][r]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> <a href="/url">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>outer<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>mid<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The band above that floor, with the definition inside the note and a trailing
line below it. `[^g]` stands at column 7, so its floor is 9: the definition at 9
is the note's own, and `TAILWORD` at 6 is not - it is at or past the OUTER
note's floor of 2 and below the inner one's, so it belongs to the outer note.

::: compare

```carve
[^f]: outer

       [^g]: mid

         [r]: /url
      TAILWORD

x[^f] [^g] [t][r]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> <a href="/url">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>outer</p>
      <p>TAILWORD<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>mid<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The other side of the same floor, the control: move that trailing line to
column 9 and it is the nested note's own.

::: compare

```carve
[^f]: outer

       [^g]: mid

         [r]: /url
         TAILWORD

x[^f] [^g] [t][r]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> <a href="/url">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>outer<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>mid</p>
      <p>TAILWORD<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
