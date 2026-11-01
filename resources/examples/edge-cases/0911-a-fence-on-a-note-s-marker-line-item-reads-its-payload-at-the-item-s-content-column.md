---
page: edge-footnotes
---

## A fence on a note's marker-line item reads its payload at the item's content column

CARVE-P9-083 and CARVE-P9-067 (carve#4755). The item on a note's marker line starts its content where its text starts, here column 8, so a fence it opens strips its payload to column 8 and closes on a closer there.

:::::: compare

`````carve
x[^n]

[^n]: - ```js
        a
        ```
`````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <pre><code class="language-js">a
</code></pre>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A line left of that column misses the item: it ends the fence and is read in the note.

:::::: compare

`````carve
x[^n]

[^n]: - ```js
    a
    ```
`````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <pre><code class="language-js"></code></pre>
        </li>
      </ul>
      <p>a</p>
      <pre><code></code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A wider marker moves the column with it: `1. ` puts it at column 9.

:::::: compare

`````carve
x[^n]

[^n]: 1. ~~~
         a
         ~~~
`````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ol>
        <li>
          <pre><code>a
</code></pre>
        </li>
      </ol>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A quoted note measures the same column behind its quote prefix.

:::::: compare

`````carve
> x[^n]
>
> [^n]: - - ```
>           a
>           ```
`````

```html
<blockquote><p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p></blockquote>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <ul>
            <li>
              <pre><code>a
</code></pre>
            </li>
          </ul>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
