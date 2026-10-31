---
page: edge-footnotes
---

## A closer or caption at a note marker-line item's content column is the item's

The item on a note's marker line starts its content where its text starts, here column 8 (CARVE-P9-083), so a closer or caption line at that column ends or captions the item's block.

:::::: compare

```carve
[^f]: - :::::
        :::::

[^f]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <div>

          </div>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A caption at that column captions the item's table.

:::::: compare

```carve
[^f]: - | a |
        ^ cap

[^f]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <table>
            <caption>cap</caption>
            <tbody>
              <tr><td>a</td></tr>
            </tbody>
          </table>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A caption line under a quote there captions the quote, as it does under an item at document level.

:::::: compare

```carve
[^f]: - > q
        ^ cap

[^f]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <figure>
            <blockquote><p>q</p></blockquote>
            <figcaption>cap</figcaption>
          </figure>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

One column left the line misses the item and is the note's (carve#4496): the closer opens a div in the note, and the caption line is the note's text.

:::::: compare

```carve
[^f]: - :::::
       :::::

[^f]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <div>

          </div>
        </li>
      </ul>
      <div>

      </div>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

:::::: compare

```carve
[^f]: - | a |
       ^ cap

[^f]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <table>
            <tbody>
              <tr><td>a</td></tr>
            </tbody>
          </table>
        </li>
      </ul>
      <p>^ cap<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
