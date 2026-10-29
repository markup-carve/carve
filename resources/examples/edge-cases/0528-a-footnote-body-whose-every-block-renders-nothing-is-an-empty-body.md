## A footnote body whose every block renders nothing is an empty body

An endnote item holds the body's block elements, one line each per PART 10 §4,
and then the synthesized backlink paragraph. PART 9 §16 reads those lines off
what the blocks RENDER, so a comment, a comment fence and a raw block whose
format the target does not match each leave the body empty: the `<li>` opens
directly on the backlink paragraph, with no line held for content nobody sees.
Mixing them changes nothing, because none of them reaches the output.

::: compare

````carve
a[^1]

[^1]: %% n
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
a[^1]

[^1]: %%%
  n
  %%%
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
a[^1]

[^1]: ```=latex
  \x
  ```
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
a[^1]

[^1]: %% n

  ```=latex
  \x
  ```
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

A body holding one visible block beside an invisible one is not empty, and the
visible block keeps its own line above the backlink.

::: compare

````carve
a[^1]

[^1]: > q

  ```=latex
  \x
  ```
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

The control is `=html`, the one format the HTML target matches. That block
renders, so it takes a line of its own.

::: compare

````carve
a[^1]

[^1]: ```=html
  <b>x</b>
  ```
````

````html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <b>x</b>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
