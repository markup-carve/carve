---
page: edge-lists
---

## A folded marker keeps a note item measured from its source column

CARVE-P9-083 and PART 0 S4 (carve#4631). A marker of another list kind below a note item's column folds into the item's paragraph and changes no column, so a fence below the item's source content column leaves the item, as it does after a plain lazy line.

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
        <li>a
* z</li>
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
            <li>a
* z</li>
          </ul>
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
        <li>a
* z</li>
      </ul>
      <pre><code></code></pre>
    </li>
  </ul>
</blockquote>
<p>q</p>
````

:::
