---
page: edge-definitions
---

## An own-line plus reaches a marker-line quote at its authored column

CARVE-P9-067 and the #4623 ruling (carve#4697). A quote opened on a note's marker line retains its authored marker column for an own-line `+`. A paragraph and a list both attach at that column.

::: compare

````carve
[^f]: > a
      +
      b

[^f]
````

````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>
        <p>a</p>
        <p>b</p>
      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
[^f]: > a
      +
      - x

[^f]
````

````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>
        <p>a</p>
        <ul>
          <li>x</li>
        </ul>
      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
[^f]: > > a
        +
      > b

[^f]
````

````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>
        <blockquote>
          <p>a</p>
          <p>b</p>
        </blockquote>
      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
