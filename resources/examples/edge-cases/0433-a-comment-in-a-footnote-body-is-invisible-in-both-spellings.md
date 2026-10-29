## A comment in a footnote body is invisible in both spellings

A comment is on the invisible-line list in every host (§10 I5), so in a footnote
body at the body's minimum column it renders nothing and closes the open
paragraph - `more` is the body's SECOND paragraph, not a continuation of
`intro`. The footnote-body host had no document for either comment spelling,
which left the classification's first two properties resting on prose here.

::: compare

```carve
[^a]: intro
  %% c
  more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The fence spelling answers the same, body and closer travelling with the opener.
Leaving the fence form out is what let one delimiter's difference make the same
rule answer twice in the list-item host (carve#629, carve#634), so the new host
gets both rows rather than one.

::: compare

```carve
[^a]: intro
  %%%
  c
  %%%
  more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
