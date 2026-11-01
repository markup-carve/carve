---
page: edge-lists
---

## A folded marker keeps a note item measured from its source column

CARVE-P9-083 and PART 0 S4 (carve#4631, carve#4545). The section name predates the superseding ruling on carve#4545 and is append-only. A marker of another list kind below a note item's column opens a new list, and each list's items measure their content from their own columns.

::: compare

````carve
[^3]: - a
   * z
    ~~~
q

[^3]
````

````html
<p>q</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>z</li>
      </ul>
      <pre><code></code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
[^3]: - - a
   * z
        # H
q

[^3]
````

````html
<p>q</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <ul>
            <li>a</li>
          </ul>
        </li>
      </ul>
      <ul>
        <li>z
          <h1 id="H">H</h1>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
> - - a
>  * z
>   ~~~
q
````

````html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>a</li>
      </ul>
    </li>
  </ul>
  <ul>
    <li>z</li>
  </ul>
  <pre><code></code></pre>
</blockquote>
<p>q</p>
````

:::
