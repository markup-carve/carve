## A definition nested past a footnote body is a note, and a reference below it resolves

In a stack of nested footnote definitions, whether the innermost definition is
a NOTE and whether a reference below it is CONSUMED are settled by the spec's
current reading (markup-carve/carve#1946): the innermost `[^h]` is a third note,
and `[r]` is consumed so `[t][r]` resolves. An earlier revision read `[^h]` as
text inside `[^f]` and left `[r]` unresolved; those two facts are the ones an
engine cannot straddle, and the spec's own answer is canonical.

::: compare

```carve
[^f]: outer

   [^g]: mid

    [^h]: inner

  [r]: /url
  TAILWORD

x[^f] [^g] [^h] [t][r]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> <a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a> <a href="/url">t</a></p>
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
    <li id="fn3">
      <p>inner<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The reference axis, isolated: the innermost definition is a note and the link
below the stack resolves against a definition consumed inside it.

::: compare

```carve
[^f]: outer

  [^g]: mid

    [^h]: inner

   [r]: /url
   TAILWORD

x[^f] [^g] [^h] [t][r]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> <a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a> <a href="/url">t</a></p>
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
    <li id="fn3">
      <p>inner<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
