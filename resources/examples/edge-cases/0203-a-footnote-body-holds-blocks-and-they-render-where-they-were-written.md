## A footnote body holds blocks, and they render where they were written

A note body is a container: it holds blocks, not just inline content, and each renders at the body's own indentation. The body here ends in a PARAGRAPH, so the backlink lands in it directly; "A footnote body's last block, when it is not a paragraph, gets a synthesized paragraph for the backlink" (below) pins what happens when the last block is a code block, a block quote, a table, a div or a raw block instead.

::: compare

```carve
[^a]: intro

  | a |
  | - |
  | b |

  closing line.

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <table>
        <thead>
          <tr><th scope="col">a</th></tr>
        </thead>
        <tbody>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <p>closing line.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
