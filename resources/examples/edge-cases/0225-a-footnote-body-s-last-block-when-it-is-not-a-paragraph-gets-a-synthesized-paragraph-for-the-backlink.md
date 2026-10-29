## A footnote body's last block, when it is not a paragraph, gets a synthesized paragraph for the backlink

A footnote body whose last block is a paragraph gets its backlink appended
directly into that paragraph (see above). When the last block is something
else, the backlink is never folded into a paragraph found inside or before
that block - a synthesized `<p>` after the last block holds it instead,
as a sibling of that block (carve#688). Five shapes, previously unpinned:

A code block:

::: compare

````carve
[^a]: note
  ```
  code
  ```

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <pre><code>code
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A block quote. The quote's own paragraph ("quoted") is not where the backlink
goes - that would misattribute it to the quoted source. The synthesized
paragraph is a sibling of the `<blockquote>`, not a child of it:

::: compare

```carve
[^a]: note
  > quoted

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <blockquote><p>quoted</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A table:

::: compare

```carve
[^a]: note

  | a |
  | - |
  | b |

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <table>
        <thead>
          <tr><th scope="col">a</th></tr>
        </thead>
        <tbody>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A div:

:::::: compare

```carve
[^a]: note

  ::: note
  d
  :::

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <aside class="admonition note" aria-label="Note">
        <p>d</p>
      </aside>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A raw block. Its content is passed through verbatim by definition; appending
the backlink inside it would put navigation markup into a region the author
asked to be left untouched, so the synthesized paragraph follows it instead:

::: compare

````carve
[^a]: note

  ```=html
  <b>x</b>
  ```

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <b>x</b>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
