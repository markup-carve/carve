## A trailing line after a consumed definition is placed by column-reach

In the nested stack (markup-carve/carve#1946), a definition consumed below the
notes and the line following it belong to the innermost note whose BODY CONTENT
COLUMN - its own marker column plus two - the line's indentation reaches. The
two rows of the section above pin the OUTER band; these pin the MID and INNER
ones, so all three sinks are covered.

The MID band: the payload sits at column 4, past the mid note's body column
(marker 2 plus two) but short of the inner note's (marker 6 plus two), so `[r]`
is consumed inside `[^g]` and `TAILWORD` is its second paragraph.

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
      <p>outer<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>mid</p>
      <p>TAILWORD<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>inner<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The INNER band: the payload sits at column 7, past the inner note's own body
column (marker 4 plus two), so `[r]` and `TAILWORD` land in `[^h]`.

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
      <p>outer<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>mid<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>inner</p>
      <p>TAILWORD<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
