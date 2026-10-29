## A fence after a footnote quote has its own base

PART 0 [CARVE-P0-004] gives a recognized opener past the footnote body's
minimum column its own authored base. Under PART 2 [CARVE-P2-008], an
unmarked blank ends the preceding quote, so the code or raw fence opens a
sibling block in the footnote.
PART 2 [CARVE-P2-006] measures its closer from that fence's base.
The paragraph controls use column 3 (carve#2598).

::: compare

````carve
x[^1]

[^1]: > q

  ```js
  c
  ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <pre><code class="language-js">c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q

   ```js
   c
   ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <pre><code class="language-js">c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q

        ```js
        c
        ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <pre><code class="language-js">c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q

  ```=latex
  c
  ```

  after
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <p>after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q

   ```=latex
   c
   ```

  after
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <p>after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q

        ```=latex
        c
        ```

  after
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <p>after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: q

   ```js
   c
   ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>q</p>
      <pre><code class="language-js">c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: q

   ```=latex
   c
   ```

  after
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>q</p>
      <p>after<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
